require('dotenv').config();
let express = require('express');
let app = express();
let bodyParser = require('body-parser');
let path = require('path');
let cors = require('cors');
const axios = require('axios');

const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");



app.use(
    cors({
        origin: '*',
    })
);
app.use(express.json());

app.use(bodyParser.urlencoded({ extended: true }));

const MODEL_NAME = "gemini-1.5-pro-latest";
const API_KEY = process.env.GEMINI_API_KEY;
//const GEMINI_API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
const genAI = new GoogleGenerativeAI(API_KEY);

const generationConfig = {
    temperature: 0.5, // Lower for more factual code help
    topK: 1,
    topP: 1,
    maxOutputTokens: 8192, // gemini-1.5-pro can handle this
};

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
app.get('/', function (req, res) {
    res.json({message:"hello"});
});

app.post('/analyze-error', async (req, res) => {
  const { errorMessage, code } = req.body;

  if (!errorMessage || !code) {
    return res.status(400).json({ error: "Missing errorMessage or code" });
  }
  const prompt = `
Act as an expert  debugger and senior software engineer.
I have the following code:


${code}
\`\`\`

When I try to run this code, I encounter the following error:

\`\`\`
${errorMessage}
\`\`\`

Please provide the following in a clear, structured format:
1.  **Explanation:** A concise explanation of what this error means in the context of my code.
2.  **Suggested Fix(es):** One or more specific suggestions on how to fix the error. If possible, show the corrected code snippet(s) using markdown code blocks.
3.  **Relevant Web Links:** Three relevant web links (e.g., official documentation, Stack Overflow posts, helpful articles) that could help me understand and resolve this issue. Please provide the full URLs, each on a new line, and prefix each link with "LINK: ".
    Example:
    LINK: https://example.com/doc1
    LINK: https://stackoverflow.com/q/12345
`;





  try {
        

        // console.log("Raw API Response:", JSON.stringify(response.data, null, 2)); // For debugging

        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            generationConfig,
            safetySettings
        });

        console.log(`Sending request to Gemini API (${MODEL_NAME}) with SDK...`);
        const result = await model.generateContent(prompt);
        const response = result.response;

        // Check if the response was blocked or has no candidates
        if (!response || !response.candidates || response.candidates.length === 0) {
            if (response && response.promptFeedback && response.promptFeedback.blockReason) {
                console.error("Prompt blocked due to safety settings:", response.promptFeedback.blockReason);
                console.error("Safety Ratings:", response.promptFeedback.safetyRatings);
                return { 
                    error: "Prompt blocked by safety filters.", 
                    details: response.promptFeedback 
                };
            } else {
                console.error("No content generated or no candidates. Full response object:", response);
                return { 
                    error: "No content generated or no candidates in response.", 
                    details: response 
                };
            }
        }
        
        const text = response.text(); // Extracts the text content
        console.log(text)

        // Basic parsing for links (you might want more sophisticated parsing)
        const links = [];
        text.split('\n').forEach(line => {
            if (line.trim().startsWith("LINK: ")) {
                links.push(line.replace("LINK: ", "").trim());
            }
        });

        res.json({fullResponse: text,
            extractedLinks: links})
        
        



       

    } catch (error) {

      console.error("Error calling Gemini API with SDK:", error);
        // The SDK error object might contain more structured information
        return {
            error: `API request failed: ${error.message}`,
            details: error // The error object itself might be useful
        };
        
    }
});

app.listen(8000, () => {
    console.log('Server is running on port 8000');
});


/*




*/