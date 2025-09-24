const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize the AI client with the secret API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.handler = async function (event, context) {
  // Ensure we only process POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // Get the detailed prompt that our frontend script will create
    const { userInput: promptFromFrontend } = JSON.parse(event.body);

    // Select the AI model and set the key configuration for JSON output
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        response_mime_type: "application/json",
      },
    });

    const result = await model.generateContent(promptFromFrontend);
    const responseText = result.response.text();

    // Pass the AI's JSON response directly back to the frontend
    return {
      statusCode: 200,
      body: responseText, // This will be a string of JSON data
    };
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: "Error processing your request with the AI." }) 
    };
  }
};