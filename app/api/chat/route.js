import { NextResponse } from "next/server";
import { PineconeClient } from '@pinecone-database/pinecone';
import OpenAI from "openai";

const systemPrompt = `System Prompt: Rate My Professor Assistant

You are a helpful "Rate My Professor" assistant designed to help students find the best professors according to their specific queries. Each time a user asks for recommendations, you will use Retrieval-Augmented Generation (RAG) to search through the available data and provide the top 3 professors that best match the user's criteria.

Instructions:
Understand the Query: Analyze the student's query to determine the key criteria they are looking for in a professor, such as subject, rating, teaching style, or specific keywords in reviews.

Data Retrieval: Utilize RAG to search through the professor review dataset, filtering and ranking professors based on relevance to the query.

Response Format: Present the top 3 professors who best match the query. For each professor, provide:

Name: The professor’s name.
Subject: The subject they teach.
Rating: Their average star rating (out of 5).
Review Summary: A brief summary of relevant reviews highlighting why they match the query.
Example Response:

User Query: "Looking for a great Physics professor who is easy to understand."
Response:
Dr. John Smith
Subject: Physics
Rating: 4.8/5
Review Summary: Students appreciate Dr. Smith for his clear explanations and approachable demeanor, making complex topics easy to grasp.
Prof. Michael Green
Subject: Physics
Rating: 4.7/5
Review Summary: Known for breaking down difficult concepts into simple terms, Prof. Green is highly rated for his engaging lectures.
Dr. Emily Brown
Subject: Physics
Rating: 4.6/5
Review Summary: Dr. Brown is praised for her structured and easy-to-follow teaching style, making her classes accessible to all students.
Clarify and Refine: If the user's query is too broad or unclear, ask follow-up questions to better understand their needs before providing recommendations.

Be Polite and Concise: Always maintain a polite tone, provide concise recommendations, and avoid overwhelming the user with too much information.`;

export async function POST(req) {
    const data = await req.json();

    const client = new PineconeClient();
    await client.init({
        apiKey: process.env.PINECONE_API_KEY,
         // Ensure this is set in your environment variables
    });

    const index = client.Index('rag'); // Correct usage for creating an index client
    const openai = new OpenAI();
    const text = data[data.length - 1].content;

    const embedding = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: [text],
        encoding_format: 'float'
    });

    const results = await index.query({
        topK: 3, // Note that `topK` might be case-sensitive depending on the library
        includeMetadata: true, // Correcting the case to match the expected format
        vector: embedding.data[0].embedding
    });

    let resultString = 'Returned results from vector db (done automatically): ';
    results.matches.forEach((match) => {
        resultString += `
        Professor: ${match.id}\n
        Subject: ${match.metadata.subject}\n
        Stars: ${match.metadata.stars}\n\n`;
    });

    const lastMessage = data[data.length - 1];
    const lastMessageContent = lastMessage.content + resultString;
    const lastDataWithoutLastMessage = data.slice(0, data.length - 1);

    const completion = await openai.chat.completions.create({
        messages: [
            {
                role: 'system',
                content: systemPrompt
            },
            ...lastDataWithoutLastMessage,
            {
                role: 'user',
                content: lastMessageContent
            }
        ],
        model: 'gpt-4o-mini',
        stream: true
    });

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            try {
                for await (const chunk of completion) {
                    const content = chunk.choices[0]?.delta?.content;
                    if (content) {
                        const text = encoder.encode(content);
                        controller.enqueue(text);
                    }
                }
            } catch (err) {
                controller.error(err);
            } finally {
                controller.close();
            }
        }
    });

    return new Response(stream);
}
