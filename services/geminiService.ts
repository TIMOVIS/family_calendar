
import { FunctionDeclaration, Type } from "@google/genai";
import { CalendarEvent, FamilyMember, ChatResponse, EventCategory } from "../types";
import { generateId, mapNamesToIds } from "../utils";

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
    const eventsData = events.map(e => ({
      id: e.id,
      title: e.title,
      start: e.start instanceof Date ? e.start.toISOString() : e.start,
      end: e.end instanceof Date ? e.end.toISOString() : e.end,
      category: e.category,
      location: e.location,
      memberIds: e.memberIds
    }));

    const response = await fetch('/.netlify/functions/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userMessage,
        events: eventsData,
        members: members.map(m => ({
          id: m.id,
          name: m.name,
          avatar: m.avatar,
          color: m.color,
          isAdmin: m.isAdmin
        }))
      }),
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.details || errorMessage;
      } catch (e) {
        try {
          const text = await response.text();
          if (text) errorMessage = text;
        } catch (e2) {
          // Ignore
        }
      }
      
      if (import.meta.env.DEV && (response.status === 404 || response.status === 0)) {
        errorMessage = 'Netlify function not available. To test locally:\n1. Install Netlify CLI: npm install -g netlify-cli\n2. Create a .env file with GEMINI_API_KEY=your_key\n3. Run: netlify dev (instead of npm run dev)';
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();

    let action = undefined;
    if (data.action) {
      if (data.action.type === 'ADD') {
        action = {
          type: 'ADD' as const,
          payload: {
            id: generateId(),
            title: data.action.payload.title,
            start: new Date(data.action.payload.start),
            end: new Date(data.action.payload.end),
            description: data.action.payload.description || '',
            location: data.action.payload.location || '',
            category: (data.action.payload.category || EventCategory.FAMILY) as EventCategory,
            memberIds: mapNamesToIds(data.action.payload.attendeeNames || [], members),
            audioMessages: []
          }
        };
      } else if (data.action.type === 'UPDATE') {
        action = {
          type: 'UPDATE' as const,
          payload: {
            id: data.action.payload.id,
            updates: {
              ...data.action.payload.updates,
              start: data.action.payload.updates.start ? new Date(data.action.payload.updates.start) : undefined,
              end: data.action.payload.updates.end ? new Date(data.action.payload.updates.end) : undefined,
              memberIds: data.action.payload.updates.attendeeNames ? mapNamesToIds(data.action.payload.updates.attendeeNames, members) : undefined
            }
          }
        };
      } else if (data.action.type === 'DELETE') {
        action = {
          type: 'DELETE' as const,
          payload: data.action.payload
        };
      }
    }

    return { 
      text: data.text || "I didn't catch that.", 
      action: action as any 
    };

  } catch (error) {
    console.error("API Error:", error);
    return { 
      text: error instanceof Error 
        ? `Error: ${error.message}` 
        : "I'm having trouble connecting to the calendar service right now." 
    };
  }
};
