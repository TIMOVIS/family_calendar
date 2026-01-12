
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
  members: FamilyMember[],
  fileContent?: string
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
        fileContent,
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

    // Helper function to transform action payload
    const transformAction = (actionData: any) => {
      if (actionData.type === 'ADD') {
        return {
          type: 'ADD' as const,
          payload: {
            id: generateId(),
            title: actionData.payload.title,
            start: new Date(actionData.payload.start),
            end: new Date(actionData.payload.end),
            description: actionData.payload.description || '',
            location: actionData.payload.location || '',
            category: (actionData.payload.category || EventCategory.FAMILY) as EventCategory,
            memberIds: mapNamesToIds(actionData.payload.attendeeNames || [], members),
            audioMessages: []
          }
        };
      } else if (actionData.type === 'UPDATE') {
        return {
          type: 'UPDATE' as const,
          payload: {
            id: actionData.payload.id,
            updates: {
              ...actionData.payload.updates,
              start: actionData.payload.updates.start ? new Date(actionData.payload.updates.start) : undefined,
              end: actionData.payload.updates.end ? new Date(actionData.payload.updates.end) : undefined,
              memberIds: actionData.payload.updates.attendeeNames ? mapNamesToIds(actionData.payload.updates.attendeeNames, members) : undefined
            }
          }
        };
      } else if (actionData.type === 'DELETE') {
        return {
          type: 'DELETE' as const,
          payload: actionData.payload
        };
      }
      return actionData;
    };

    // Process multiple actions if present, otherwise single action
    const actionsArray = data.actions || (data.action ? [data.action] : []);
    const transformedActions = actionsArray.map(transformAction);

    return { 
      text: data.text || "I didn't catch that.", 
      action: transformedActions[0] as any, // Single action for backward compatibility
      actions: transformedActions.length > 1 ? transformedActions : undefined // Multiple actions for file uploads
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
