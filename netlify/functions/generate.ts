import { Handler } from '@netlify/functions';
import { GoogleGenAI, FunctionDeclaration, Type } from '@google/genai';

// Tool definitions (same as in geminiService.ts)
export const addEventTool: FunctionDeclaration = {
  name: "addEvent",
  description: "Add a new event to the calendar.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "The title of the event" },
      start: { type: Type.STRING, description: "Start time in ISO format (e.g., 2023-10-27T10:00:00)" },
      end: { type: Type.STRING, description: "End time in ISO format" },
      description: { type: Type.STRING, description: "Optional description" },
      location: { type: Type.STRING, description: "Optional location" },
      category: { 
        type: Type.STRING, 
        description: "One of: Family, Work, School, Fun, Chore, Health, Other",
        enum: ['Family', 'Work', 'School', 'Fun', 'Chore', 'Health', 'Other']
      },
      attendeeNames: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING }, 
        description: "List of family member names attending" 
      }
    },
    required: ["title", "start", "end", "category"]
  }
};

export const updateEventTool: FunctionDeclaration = {
  name: "updateEvent",
  description: "Update an existing event. Only provide fields that need changing.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING, description: "The ID of the event to update" },
      title: { type: Type.STRING },
      start: { type: Type.STRING },
      end: { type: Type.STRING },
      description: { type: Type.STRING },
      location: { type: Type.STRING },
      category: { type: Type.STRING },
      attendeeNames: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["id"]
  }
};

export const deleteEventTool: FunctionDeclaration = {
  name: "deleteEvent",
  description: "Delete an event from the calendar.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING, description: "The ID of the event to delete" }
    },
    required: ["id"]
  }
};

export const handler: Handler = async (event, context) => {
  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
      };
    }

    const ai = new GoogleGenAI({ apiKey });

    const { userMessage, fileContent, events, members } = JSON.parse(event.body || '{}');

    if (!userMessage && !fileContent) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'userMessage or fileContent is required' }),
      };
    }

    const eventsContext = events.map((e: any) => ({
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      category: e.category,
      location: e.location,
      attendees: e.memberIds.map((mid: string) => members.find((m: any) => m.id === mid)?.name || mid).join(', ')
    }));

    let systemPrompt = `
      You are fam.ly, a family calendar assistant.
      Current Date/Time: ${new Date().toLocaleString()}
      
      Family Members: ${members.map((m: any) => m.name).join(', ')}

      Current Schedule:
      ${JSON.stringify(eventsContext, null, 2)}
      
      Capabilities:
      1. Answer questions about the schedule.
      2. Handle specific search queries like "When is Mia's practice?" or "What's happening on Monday?".
      3. Identify events by attendee names, times (e.g., "at 10am"), or dates.
      4. ADD, EDIT, or DELETE events using the provided tools.
      5. Analyze uploaded files (like learning plans, schedules, etc.) and create calendar events from them.
      
      Rules:
      - If adding an event, infer the end time (1 hour duration) if not specified.
      - If modifying/deleting, find the event ID from the Current Schedule JSON.
      - If the user asks for a specific person's schedule, list their events clearly.
      - Be friendly, concise, and helpful.
    `;

    // Add file analysis instructions if file content is provided
    if (fileContent) {
      systemPrompt += `
      
      FILE ANALYSIS MODE:
      The user has uploaded a file. Your task is to:
      1. Analyze the file content and extract all relevant information about events, schedules, or learning plans.
      2. Check if the following information is present for each event/session:
         - Title/Name of the event/session
         - Start date and time (or day of week and time)
         - Duration or end time
         - Attendees/participants (match names to family members: ${members.map((m: any) => m.name).join(', ')})
         - Location (if mentioned)
         - Category (School, Work, Family, Fun, Chore, Health, or Other)
         - Description/details
      
      3. If any information is missing, ask clarifying questions BEFORE creating events:
         - "When should this plan start?" (if start date is missing)
         - "What time do the sessions take place?" (if time is missing)
         - "Which day(s) of the week?" (if day is missing)
         - "Who should attend these sessions?" (if attendees are missing)
         - "How long is each session?" (if duration is missing)
      
      4. Once you have all necessary information, create the events using the addEvent tool.
         - For recurring events (like weekly sessions), create individual events for each occurrence.
         - Use the current date as reference if relative dates are mentioned (e.g., "next month").
         - Default to 1 hour duration if not specified.
         - Match attendee names to family member names when possible.
      
      5. After creating events, confirm what was created: "I've created X events from your file: [list of event titles]"
      
      File Content:
      ${fileContent.substring(0, 50000)}${fileContent.length > 50000 ? '\n\n[File content truncated - first 50,000 characters shown]' : ''}
      `;
    }

    // Build the content message - include file content if provided
    let contentMessage = userMessage || '';
    if (fileContent) {
      contentMessage = userMessage 
        ? `${userMessage}\n\nPlease analyze the uploaded file and help create calendar events.`
        : 'Please analyze the uploaded file and help create calendar events.';
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: contentMessage,
      config: {
        systemInstruction: systemPrompt,
        tools: [{ functionDeclarations: [addEventTool, updateEventTool, deleteEventTool] }],
        temperature: 0.7,
      },
    });

    let responseText = response.text || "";
    let action = undefined;
    const actions: any[] = [];

    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      // Process all function calls (for multiple event creation from files)
      const eventTitles: string[] = [];
      
      for (const fc of functionCalls) {
        const args = fc.args as any;

        if (fc.name === 'addEvent') {
          eventTitles.push(args.title);
          actions.push({
            type: 'ADD',
            payload: {
              title: args.title,
              start: args.start,
              end: args.end,
              description: args.description || '',
              location: args.location || '',
              category: args.category || 'Family',
              attendeeNames: args.attendeeNames || []
            }
          });
        } 
        else if (fc.name === 'updateEvent') {
          actions.push({
            type: 'UPDATE',
            payload: {
              id: args.id,
              updates: {
                  ...args,
                  start: args.start ? args.start : undefined,
                  end: args.end ? args.end : undefined,
                  attendeeNames: args.attendeeNames || undefined
              }
            }
          });
        } 
        else if (fc.name === 'deleteEvent') {
          actions.push({
            type: 'DELETE',
            payload: args.id
          });
        }
      }

      // Set response text and action (use first action for backward compatibility)
      if (actions.length > 0) {
        if (eventTitles.length > 1) {
          responseText = responseText || `I've created ${eventTitles.length} events: ${eventTitles.join(', ')}`;
        } else if (eventTitles.length === 1) {
          responseText = responseText || `I've added "${eventTitles[0]}" to the calendar.`;
        } else {
          responseText = responseText || actions[0].type === 'UPDATE' ? "I've updated the event." : "Event deleted.";
        }
        action = actions[0]; // Return first action for backward compatibility
      }
    }

    if (!responseText && !action) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ text: "I didn't catch that." }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        text: responseText, 
        action, // Single action for backward compatibility
        actions: actions.length > 0 ? actions : undefined // Multiple actions for file uploads
      }),
    };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
    };
  }
};




