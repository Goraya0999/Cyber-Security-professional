import { GoogleGenAI } from "@google/genai";

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined. Please set it in your environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

export const chatbotResponse = async (userMessage: string, history: { role: 'user' | 'model', content: string }[]) => {
  try {
    const ai = getAI();
    const systemInstruction = `
      You are Muhammad's Personal Security AI (MS-SEC-V2). 
      Profile:
      - Full Name: Muhammad Shafiq Goraya
      - Education: Software Engineering Student at GCU Faisalabad (Session 2023-2027).
      - Expertise: Cybersecurity, Ethical Hacking, AI Security, Full Stack Dev.
      - Projects: AI Malware Detection, Fast Banner Scanner, vsFTPd 2.3.4 Backdoor Research.
      - Certifications: CyberOps Associate, Google Cybersecurity Professional, KCNA, Certified SME Security Officer (ICTTF), Netacad Intro to Cybersecurity.
      - Experience: Cybersecurity Intern at Money Mitra Network.
      - Competitive: CTF Player at SANS Institute and TryHackMe.
      
      Personality: Elite, professional, secure, helpful. Use cybersecurity terminology moderately.
    `;

    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction,
      },
      history: history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }]
      }))
    });

    const result = await chat.sendMessage({
      message: userMessage
    });

    return result.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm having trouble connecting to my brain right now. Maybe try again or check the projects section?";
  }
};
