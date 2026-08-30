import express from "express";
import http from "http";
import path from "path";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Modality } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const PORT = 3000;
const app = express();
app.use(express.json({ limit: "10mb" }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws/live" });

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// Post-session structured feedback generation endpoint
app.post("/api/feedback", async (req, res) => {
  try {
    const { transcript, topicTitle, cueCardText, testType, bulletPoints, pacingStats } = req.body;

    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
      return res.status(400).json({ error: "Transcript is required for feedback analysis." });
    }

    const ai = getGeminiClient();

    const formattedTranscript = transcript
      .map((item: { speaker: string; text: string; part?: number }) => 
        `[${item.speaker.toUpperCase()}${item.part ? ` - Part ${item.part}` : ''}]: ${item.text}`
      )
      .join("\n");

    const pacingContext = pacingStats ? `
Candidate Pacing & Speech Flow Telemetry (measured from active candidate speaking time):
- Total Words Spoken by Candidate: ${pacingStats.totalWords || 0} words
- Active Candidate Speaking Time (clock-paused during examiner turns and Part 2 prep): ${pacingStats.activeSpeakingSeconds || 0} seconds
- Average Speech Rate: ${pacingStats.avgWpm || 0} WPM
- Peak Burst Speed (rolling 10-15s window): ${pacingStats.peakWpm || 0} WPM
` : '';

    const prompt = `You are a certified senior IELTS Speaking Examiner. Analyze the following candidate transcript from an IELTS Speaking test and generate an accurate, fair, and structured assessment following official IELTS assessment criteria.

Test Topic: "${topicTitle || 'General Speaking'}"
${cueCardText ? `Cue Card: "${cueCardText}"` : ''}
${bulletPoints && bulletPoints.length ? `Bullet Points: ${bulletPoints.join('; ')}` : ''}
Test Mode: ${testType || 'Full Test'}

Candidate Transcript:
"""
${formattedTranscript}
"""
${pacingContext}

Evaluate the candidate strictly on the four official IELTS Speaking assessment criteria:
1. Fluency and Coherence (FC)
2. Lexical Resource (LR)
3. Grammatical Range and Accuracy (GRA)
4. Pronunciation (PR) - note: evaluate acoustic clarity indicators, word stress patterns, sentence rhythm, and connected speech markers inferred from word choices, discourse markers, and natural phrasing in the transcript.

Also provide a "pacingSummary" object. Note: In official IELTS scoring, pacing is evaluated qualitatively (hesitations, pauses, coherence, flow) rather than via a rigid WPM rule. Frame the pacing assessment as practical coaching feedback explaining how their tempo (~120-155 WPM typical comfortable conversational flow, <115 WPM cautious/hesitant, >170 WPM rushed/high-speed burst risk) supports their fluency and clarity.

Return ONLY a valid JSON object matching this exact structure:
{
  "overallBand": 6.5,
  "estimatedCEFR": "B2",
  "overallSummary": "2-3 sentences summarizing the candidate's performance, communication efficacy, and overall impression.",
  "pacingSummary": {
    "avgWpm": ${pacingStats?.avgWpm || 135},
    "peakWpm": ${pacingStats?.peakWpm || 155},
    "totalWords": ${pacingStats?.totalWords || 280},
    "activeSpeakingSeconds": ${pacingStats?.activeSpeakingSeconds || 125},
    "pacingAssessment": "1-2 sentences giving qualitative coaching feedback on the candidate's speaking pace and flow.",
    "coachingAdvice": "1 actionable advice sentence regarding speech tempo, pausing, and rhythmic delivery."
  },
  "fluencyCoherence": {
    "criterionName": "Fluency and Coherence",
    "band": 6.5,
    "feedback": "2-3 sentences analyzing speech rate, hesitations, connective devices, flow, and coherence.",
    "studentQuote": "exact quote from the student from the transcript",
    "suggestedImprovement": "specific advice on how to improve this exact quote or section"
  },
  "lexicalResource": {
    "criterionName": "Lexical Resource",
    "band": 6.5,
    "feedback": "2-3 sentences analyzing vocabulary range, precise word choices, idiomatic expressions, and paraphrasing.",
    "studentQuote": "exact quote illustrating candidate vocabulary usage",
    "suggestedImprovement": "specific higher-band lexical alternatives, collocations, or idiomatic phrasing"
  },
  "grammaticalRangeAccuracy": {
    "criterionName": "Grammatical Range and Accuracy",
    "band": 6.0,
    "feedback": "2-3 sentences analyzing sentence structure variety (complex/compound), tense accuracy, and error frequency.",
    "studentQuote": "exact quote illustrating grammatical usage or error",
    "suggestedImprovement": "corrected sentence structure or more advanced grammatical construction"
  },
  "pronunciation": {
    "criterionName": "Pronunciation",
    "band": 6.5,
    "feedback": "2-3 sentences analyzing rhythm, phrasing, intonation trends, and syllable stress inferred from spoken transcript cadence.",
    "studentQuote": "quote from transcript where rhythm or word stress could be optimized",
    "suggestedImprovement": "guidance on pausing, intonation, or word-linking for this quote"
  },
  "keyStrengths": [
    "strength 1",
    "strength 2",
    "strength 3"
  ],
  "actionableTips": [
    "high-leverage tip 1 for reaching the next band",
    "high-leverage tip 2",
    "high-leverage tip 3"
  ],
  "partBreakdown": {
    "part1Notes": "Brief 1-sentence note on Part 1 response speed and comfort.",
    "part2Notes": "Brief 1-sentence note on Part 2 structure, depth, and ability to speak for 2 minutes.",
    "part3Notes": "Brief 1-sentence note on Part 3 abstract reasoning and opinion development."
  }
}

Ensure all band scores are in standard 0.5 increments (e.g. 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0). Be encouraging yet completely objective, providing real value for students aiming to increase their score.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const jsonText = response.text || "{}";
    const parsedFeedback = JSON.parse(jsonText);

    // Ensure incoming client pacing stats are preserved in final payload
    if (pacingStats) {
      parsedFeedback.pacingStats = pacingStats;
      if (parsedFeedback.pacingSummary) {
        parsedFeedback.pacingSummary.avgWpm = pacingStats.avgWpm;
        parsedFeedback.pacingSummary.peakWpm = pacingStats.peakWpm;
        parsedFeedback.pacingSummary.totalWords = pacingStats.totalWords;
        parsedFeedback.pacingSummary.activeSpeakingSeconds = pacingStats.activeSpeakingSeconds;
      }
    }

    res.json({
      success: true,
      feedback: parsedFeedback,
    });
  } catch (error: any) {
    console.error("Error generating IELTS feedback:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate IELTS feedback report.",
    });
  }
});

// Build examiner system instruction based on test parameters
function buildExaminerSystemInstruction(config: {
  testType: string;
  topicTitle: string;
  cueCardText: string;
  bulletPoints: string[];
  part3Questions: string[];
  followUpQuestions: string[];
}): string {
  const { testType, topicTitle, cueCardText, bulletPoints, part3Questions, followUpQuestions } = config;

  return `You are a certified, friendly, professional, but rigorous IELTS Speaking Examiner conducting an official IELTS Speaking Test with a student candidate.

YOUR PERSONA & SPEAKING STYLE:
- Speak in natural, clear, moderately paced, articulate English with standard examiner phrasing (e.g., "Good afternoon. My name is Alex. Could you tell me your full name, please?", "Thank you. Now in this first part, I'd like to ask you some questions about...", "Let's move on to Part 2...", "Thank you. In Part 3, we'll talk more broadly about...").
- ASK ONLY ONE QUESTION AT A TIME. Never ask multiple questions in one turn.
- Listen attentively to the candidate's full response before speaking.
- DO NOT interrupt during answers unless moving to the next section or if they speak far too long.
- NEVER switch into "teacher mode" or offer corrections, tips, or scores during the test. Stay strictly in role as the examiner.
- Keep responses and question prompts concise (1-3 sentences max) so the candidate does most of the speaking.

LONG-PAUSE HANDLING & SILENCE PACING RULES:
1. Distinguish between Brief Thinking Pauses vs. Genuine Extended Silence:
   - Brief Thinking Pause (2–5 seconds): Candidates naturally pause mid-answer or right after a question to collect thoughts or structure ideas. Use continuous voice activity cues to recognize when they are in the middle of formulating an answer. DO NOT interrupt them during natural thinking pauses.
   - Prolonged Silence (~8–12 seconds): If the candidate goes completely silent for 8–12 seconds without beginning an answer or after asking a question:
     a. First prolonged silence (~8–12s): Offer a gentle, natural re-prompt or slight clarification/simplification (e.g., "Would you like me to repeat the question?", "For instance, you could think about...", "To put it another way, what is your view on...?").
     b. Continued silence after re-prompt: If silence continues for another 8-10 seconds, smoothly move on to the next question or topic (e.g., "That's fine, let's move on to the next question."), exactly as an official examiner manages time in an actual exam.
2. EXPLICIT EXCEPTION FOR PART 2 PREPARATION TIME:
   - During Part 2's 1-minute candidate preparation/notes time, SILENCE IS INTENTIONAL and timer-driven.
   - You MUST REMAIN COMPLETELY SILENT during the entire 1-minute preparation period. Do NOT re-prompt or interrupt during this 1-minute prep. Only prompt the candidate once the 1 minute has elapsed (or when the candidate states they are ready to begin).

TEST CONFIGURATION & STRUCTURE:
Test Mode: ${testType}
Part 2 Topic: "${topicTitle}"
Cue Card: "${cueCardText}"
Key Bullet Points:
${bulletPoints.map(b => `- ${b}`).join("\n")}
Follow-up Questions:
${followUpQuestions.map(q => `- ${q}`).join("\n")}
Part 3 Discussion Questions:
${part3Questions.map(q => `- ${q}`).join("\n")}

TEST FLOW RULES:
${testType === 'part1' ? `
- PART 1 ONLY: Welcome candidate briefly, ask 3-4 friendly questions about their hometown, work/studies, or everyday habits. After ~4 questions, warmly conclude the session.
` : testType === 'part2' ? `
- PART 2 ONLY: State that this is Part 2. Read out the cue card topic clearly: "${cueCardText}". Tell them they have 1 minute to prepare and make notes, then they will speak for 1 to 2 minutes. When they finish speaking, ask 1 follow-up question, then conclude.
` : testType === 'part3' ? `
- PART 3 ONLY: State that in this part you will discuss broader issues related to "${topicTitle}". Ask in-depth, analytical questions from the discussion list above one by one. Ask probing follow-ups ("Why do you think that is?", "Could you give an example?"). After 3-4 questions, conclude.
` : `
- FULL TEST (ALL 3 PARTS):
1. PART 1 (Introduction): Greet the candidate, ask their name, and ask 2-3 short questions about their background or hobbies. Then say: "Thank you. Now we will move on to Part 2."
2. PART 2 (Long Turn): Introduce the topic: "${cueCardText}". Inform the student: "I'm going to give you a topic and I'd like you to talk about it for one to two minutes. Before you talk, you'll have one minute to think about what you're going to say. Here is your topic." (Allow candidate to speak). After they finish their 2-minute talk, ask 1 brief follow-up question. Then say: "Thank you. Now, let's discuss some broader questions related to this."
3. PART 3 (Discussion): Ask 2-3 deeper, abstract questions exploring societal impacts, trends, and differing viewpoints related to "${topicTitle}".
4. CONCLUSION: Say: "Thank you very much. That is the end of the speaking test. Have a wonderful day."
`}

STARTING THE TEST:
When the connection starts, immediately begin as the examiner with a warm, standard IELTS opening greeting (e.g. "Good day. My name is Alex. Could you tell me your full name, please?").`;
}

// WebSocket live connection handler for bidirectional audio streaming with Gemini Live API
wss.on("connection", async (clientWs: WebSocket) => {
  console.log("Client connected to Live audio WebSocket gateway");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    clientWs.send(JSON.stringify({
      type: "error",
      message: "Server configuration error: GEMINI_API_KEY is not set."
    }));
    clientWs.close();
    return;
  }

  let session: any = null;
  let isSessionReady = false;
  const pendingAudioQueue: string[] = [];

  clientWs.on("message", async (rawMessage) => {
    try {
      const data = JSON.parse(rawMessage.toString());

      if (data.type === "start_session") {
        const { testType = "full", topicTitle = "General", cueCardText = "", bulletPoints = [], part3Questions = [], followUpQuestions = [], voice = "Puck" } = data;
        const systemInstructionText = buildExaminerSystemInstruction({
          testType,
          topicTitle,
          cueCardText,
          bulletPoints,
          part3Questions,
          followUpQuestions
        });

        const ai = getGeminiClient();

        try {
          session = await ai.live.connect({
            model: "gemini-3.1-flash-live-preview",
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: voice || "Puck"
                  }
                }
              },
              systemInstruction: systemInstructionText,
              outputAudioTranscription: {},
            },
            callbacks: {
              onmessage: (message: any) => {
                if (message.serverContent) {
                  const modelTurn = message.serverContent.modelTurn;
                  const interrupted = message.serverContent.interrupted;
                  const turnComplete = message.serverContent.turnComplete;

                  if (interrupted) {
                    clientWs.send(JSON.stringify({ type: "examiner_interrupted" }));
                  }

                  if (modelTurn && modelTurn.parts) {
                    for (const part of modelTurn.parts) {
                      // Audio chunk
                      if (part.inlineData && part.inlineData.data) {
                        clientWs.send(JSON.stringify({
                          type: "audio_output",
                          pcm24Base64: part.inlineData.data,
                          mimeType: part.inlineData.mimeType || "audio/pcm;rate=24000"
                        }));
                      }
                      // Text transcription from model
                      if (part.text) {
                        clientWs.send(JSON.stringify({
                          type: "examiner_text",
                          text: part.text
                        }));
                      }
                    }
                  }

                  if (turnComplete) {
                    clientWs.send(JSON.stringify({ type: "turn_complete" }));
                  }
                }
              },
              onerror: (err: any) => {
                console.error("Gemini Live session error:", err);
                clientWs.send(JSON.stringify({
                  type: "error",
                  message: "Live audio engine encountered an error."
                }));
              },
              onclose: (e: any) => {
                console.log("Gemini Live session closed:", e);
                isSessionReady = false;
                clientWs.send(JSON.stringify({
                  type: "gemini_closed",
                  reason: e?.reason || "Live session closed"
                }));
              }
            }
          });

          console.log("Gemini Live session connected successfully");
          isSessionReady = true;
          clientWs.send(JSON.stringify({ type: "gemini_connected" }));
          clientWs.send(JSON.stringify({ type: "session_ready" }));

          // Flush any buffered audio
          while (pendingAudioQueue.length > 0) {
            const chunk = pendingAudioQueue.shift();
            if (chunk && session) {
              session.sendRealtimeInput({
                audio: { data: chunk, mimeType: "audio/pcm;rate=16000" }
              });
            }
          }
        } catch (connErr: any) {
          console.error("Failed to connect Gemini Live session:", connErr);
          clientWs.send(JSON.stringify({
            type: "error",
            message: connErr?.message || "Could not connect to Gemini Live API."
          }));
        }
      } else if (data.type === "audio_chunk") {
        // Forward base64 PCM 16kHz audio from client mic to Gemini Live API
        if (data.pcm16Base64 && isSessionReady && session) {
          session.sendRealtimeInput({
            audio: { data: data.pcm16Base64, mimeType: "audio/pcm;rate=16000" }
          });
        } else if (data.pcm16Base64 && !isSessionReady) {
          if (pendingAudioQueue.length < 5) {
            pendingAudioQueue.push(data.pcm16Base64);
          }
        }
      } else if (data.type === "text_prompt") {
        // Direct prompt / user turn
        if (isSessionReady && session) {
          session.sendClientContent({
            turns: [
              {
                role: "user",
                parts: [{ text: data.text }]
              }
            ],
            turnComplete: true
          });
        }
      } else if (data.type === "client_interrupted") {
        // Candidate interrupted AI (barge-in notification)
        console.log("Candidate barged in / interrupted AI examiner");
      }
    } catch (e) {
      console.error("Error processing client message:", e);
    }
  });

  // Client socket cleanup
  clientWs.on("close", () => {
    console.log("Client disconnected from Live WebSocket");
    if (session) {
      try {
        session.close();
      } catch (err) {
        console.error("Error closing session:", err);
      }
    }
  });
});

async function startServer() {
  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`IELTS Speaking Coach server running on http://localhost:${PORT}`);
  });
}

startServer();
