
import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import { CalendarEvent, FamilyMember, ChatResponse, EventCategory } from "../types";
import { generateId, mapNamesToIds } from "../utils";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Tool Definitions ---

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
        enum: Object.values(EventCategory)
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

export const generateCalendarAdvice = async (
  userMessage: string,
  events: CalendarEvent[],
  members: FamilyMember[]
): Promise<ChatResponse> => {
  try {
    const eventsContext = events.map(e => ({
      id: e.id,
      title: e.title,
      start: e.start.toLocaleString(),
      end: e.end.toLocaleString(),
      category: e.category,
      location: e.location,
      attendees: e.memberIds.map(mid => members.find(m => m.id === mid)?.name || mid).join(', ')
    }));

    const systemPrompt = `
      You are fam.ly, a family calendar assistant.
      Current Date/Time: ${new Date().toLocaleString()}
      
      Family Members: ${members.map(m => m.name).join(', ')}

      Current Schedule:
      ${JSON.stringify(eventsContext, null, 2)}
      
      Capabilities:
      1. Answer questions about the schedule.
      2. Handle specific search queries like "When is Mia's practice?" or "What's happening on Monday?".
      3. Identify events by attendee names, times (e.g., "at 10am"), or dates.
      4. ADD, EDIT, or DELETE events using the provided tools.
      
      Rules:
      - If adding an event, infer the end time (1 hour duration) if not specified.
      - If modifying/deleting, find the event ID from the Current Schedule JSON.
      - If the user asks for a specific person's schedule, list their events clearly.
      - Be friendly, concise, and helpful.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: userMessage,
      config: {
        systemInstruction: systemPrompt,
        tools: [{ functionDeclarations: [addEventTool, updateEventTool, deleteEventTool] }],
        temperature: 0.7,
      },
    });

    let responseText = response.text || "";
    let action = undefined;

    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const fc = functionCalls[0];
      const args = fc.args as any;

      if (fc.name === 'addEvent') {
        responseText = responseText || `I've added "${args.title}" to the calendar.`;
        action = {
          type: 'ADD',
          payload: {
            id: generateId(),
            title: args.title,
            start: new Date(args.start),
            end: new Date(args.end),
            description: args.description || '',
            location: args.location || '',
            category: args.category || EventCategory.FAMILY,
            memberIds: mapNamesToIds(args.attendeeNames, members),
            audioMessages: []
          }
        };
      } 
      else if (fc.name === 'updateEvent') {
        responseText = responseText || `I've updated the event.`;
        action = {
          type: 'UPDATE',
          payload: {
            id: args.id,
            updates: {
                ...args,
                start: args.start ? new Date(args.start) : undefined,
                end: args.end ? new Date(args.end) : undefined,
                memberIds: args.attendeeNames ? mapNamesToIds(args.attendeeNames, members) : undefined
            }
          }
        };
      } 
      else if (fc.name === 'deleteEvent') {
        responseText = responseText || `Event deleted.`;
        action = {
          type: 'DELETE',
          payload: args.id
        };
      }
    }

    if (!responseText && !action) {
       return { text: "I didn't catch that." };
    }

    return { text: responseText, action: action as any };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "I'm having trouble connecting to the calendar service right now." };
  }
};
