const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

// Initialize the AI client with the secret API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// NEW: Define safety settings to allow discussion of sensitive topics
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

exports.handler = async function (event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { userInput: promptFromFrontend } = JSON.parse(event.body);

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        response_mime_type: "application/json",
      },
      safetySettings, // Apply the new safety settings here
    });

    const result = await model.generateContent(promptFromFrontend);
    const responseText = result.response.text();

    return {
      statusCode: 200,
      body: responseText,
    };
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    // Also return the error message in the response body for debugging
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: `Error from API: ${error.message}` }) 
    };
  }
};