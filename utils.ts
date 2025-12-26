
import { CalendarEvent, EventCategory, FamilyMember } from './types';

export const getDaysInMonth = (year: number, month: number): Date[] => {
  const date = new Date(year, month, 1);
  const days: Date[] = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

export const getDayName = (date: Date): string => {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

export const isSameDay = (d1: Date, d2: Date): boolean => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const mapNamesToIds = (names: string[] | undefined, members: FamilyMember[]): string[] => {
  if (!names || names.length === 0) return [];
  const ids: string[] = [];
  names.forEach(name => {
    const member = members.find(m => m.name.toLowerCase().includes(name.toLowerCase()));
    if (member) ids.push(member.id);
  });
  return ids.length > 0 ? ids : [members[0].id]; 
};

// --- ICS / Calendar Sync Utilities ---

const formatICSDate = (date: Date): string => {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

export const downloadICS = (events: CalendarEvent[]) => {
  let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//fam.ly//Calendar//EN\nCALSCALE:GREGORIAN\n";
  
  events.forEach(event => {
    icsContent += "BEGIN:VEVENT\n";
    icsContent += `UID:${event.id}\n`;
    icsContent += `DTSTAMP:${formatICSDate(new Date())}\n`;
    icsContent += `DTSTART:${formatICSDate(event.start)}\n`;
    icsContent += `DTEND:${formatICSDate(event.end)}\n`;
    icsContent += `SUMMARY:${event.title}\n`;
    if (event.description) icsContent += `DESCRIPTION:${event.description}\n`;
    if (event.location) icsContent += `LOCATION:${event.location}\n`;
    icsContent += "END:VEVENT\n";
  });
  
  icsContent += "END:VCALENDAR";
  
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', 'famly_calendar.ics');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const parseICS = async (file: File): Promise<Partial<CalendarEvent>[]> => {
  const text = await file.text();
  const events: Partial<CalendarEvent>[] = [];
  
  const eventBlocks = text.split('BEGIN:VEVENT');
  
  const parseICSDateString = (str: string) => {
    if (!str) return new Date();
    const timeStr = str.split(':').pop() || '';
    
    const year = parseInt(timeStr.substring(0,4));
    const month = parseInt(timeStr.substring(4,6)) - 1;
    const day = parseInt(timeStr.substring(6,8));
    
    let hour = 0, min = 0, sec = 0;
    if (timeStr.includes('T')) {
      hour = parseInt(timeStr.substring(9,11));
      min = parseInt(timeStr.substring(11,13));
      sec = parseInt(timeStr.substring(13,15));
    }
    
    if (timeStr.endsWith('Z')) {
       return new Date(Date.UTC(year, month, day, hour, min, sec));
    }
    return new Date(year, month, day, hour, min, sec);
  };

  eventBlocks.slice(1).forEach(block => {
    const summaryMatch = block.match(/SUMMARY:(.*?)(?:\r\n|\r|\n)/);
    const dtStartMatch = block.match(/DTSTART(?:;.*?)?:(.*?)(?:\r\n|\r|\n)/);
    const dtEndMatch = block.match(/DTEND(?:;.*?)?:(.*?)(?:\r\n|\r|\n)/);
    const descMatch = block.match(/DESCRIPTION:(.*?)(?:\r\n|\r|\n)/);
    const locMatch = block.match(/LOCATION:(.*?)(?:\r\n|\r|\n)/);

    if (summaryMatch && dtStartMatch) {
      const start = parseICSDateString(dtStartMatch[1]);
      let end = dtEndMatch ? parseICSDateString(dtEndMatch[1]) : new Date(start.getTime() + 60 * 60 * 1000); 
      
      events.push({
        title: summaryMatch[1].trim(),
        start,
        end,
        description: descMatch ? descMatch[1].trim() : '',
        location: locMatch ? locMatch[1].trim() : '',
        category: EventCategory.OTHER 
      });
    }
  });

  return events;
};
