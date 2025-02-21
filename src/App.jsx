import React, { useState, useEffect } from "react";

const App = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [todoList, setTodoList] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    if (!isListening) return;
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let speech = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ");
      setTranscript(speech);
      extractTasks(speech);
    };

    recognition.start();
    return () => recognition.stop();
  }, [isListening]);

  const extractTasks = (speech) => {
    const dateRegex = /\b(on\s)?(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|today|tomorrow|next\sweek|next\smonth|the\s\d+(?:st|nd|rd|th)?\sof\s\w+|\d+(?:st|nd|rd|th)?\sof\s\w+)\b/gi;

    const matches = [];
    let match;
    while ((match = dateRegex.exec(speech)) !== null) {
      matches.push({
        text: match[0],
        index: match.index,
        endIndex: match.index + match[0].length,
      });
    }

    if (matches.length === 0) {
      setTodoList([{ text: speech.trim() }]);
      return;
    }

    const tasks = [];
    let lastEnd = 0;

    matches.forEach((dateMatch, i) => {
      const start = lastEnd;
      const end = dateMatch.index;
      const prefix = speech.slice(start, end).trim();
      const dateText = dateMatch.text;
      const nextStart = i + 1 < matches.length ? matches[i + 1].index : speech.length;
      const suffix = speech.slice(dateMatch.endIndex, nextStart).trim();

      let taskText = `${prefix} ${dateText} ${suffix}`.trim();
      taskText = taskText.replace(/\b(on\s)+(?=on\s)/gi, '').trim();
      taskText = taskText.replace(/\b(okay\s|okay well\s|well\s|also\s|last\s)/gi, '').trim();
      taskText = taskText.replace(/\bsome\s(grocery|team)/gi, '$1');
      taskText = taskText.replace(/\bgrocery\b/gi, 'groceries');
      taskText = taskText.replace(/\bwill need to plan something\b/gi, '');
      taskText = taskText.replace(/\bneed\s(deliver)/gi, 'need to deliver');
      taskText = taskText.replace(/\bis\s+/gi, 'is ');
      taskText = taskText.charAt(0).toUpperCase() + taskText.slice(1);

      if (taskText) {
        tasks.push({ text: taskText });
      }

      lastEnd = nextStart;
    });

    setTodoList(tasks.filter(task => task.text));
  };

  const handleDelete = (index) => {
    setTodoList(todoList.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditText("");
    }
  };

  const handleUpdateStart = (index) => {
    setEditingIndex(index);
    setEditText(todoList[index].text);
  };

  const handleUpdateSave = (index) => {
    const updatedList = [...todoList];
    updatedList[index] = { text: editText.trim() };
    setTodoList(updatedList);
    setEditingIndex(null);
    setEditText("");
  };

  const handleUpdateCancel = () => {
    setEditingIndex(null);
    setEditText("");
  };

  const handleAddToCalendar = (taskText) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    const dateMatch = taskText.match(
      /\b(on\s)?(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|today|tomorrow|next\sweek|next\smonth|the\s\d+(?:st|nd|rd|th)?\sof\s\w+|\d+(?:st|nd|rd|th)?\sof\s\w+)\b/i
    );
    let eventDate = now;
    let eventTime = "10:00";

    if (dateMatch) {
      const dateStr = dateMatch[0].toLowerCase();
      if (dateStr.includes("today")) {
        eventDate = now;
      } else if (dateStr.includes("tomorrow")) {
        eventDate = new Date(now);
        eventDate.setDate(now.getDate() + 1);
      } else if (dateStr.includes("next week")) {
        eventDate = new Date(now);
        eventDate.setDate(now.getDate() + 7);
      } else if (dateStr.includes("next month")) {
        eventDate = new Date(now);
        eventDate.setMonth(now.getMonth() + 1);
      } else if (dateStr.match(/the\s\d+(st|nd|rd|th)?\sof\s\w+/i)) {
        const [_, day, month] = dateStr.match(/the\s(\d+)(?:st|nd|rd|th)?\sof\s(\w+)/i);
        eventDate = new Date(`${month} ${day}, ${currentYear}`);
      } else if (dateStr.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i)) {
        const dayName = dateStr.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i)[0];
        const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const targetDay = daysOfWeek.indexOf(dayName);
        eventDate = new Date(now);
        eventDate.setDate(now.getDate() + ((targetDay + 7 - now.getDay()) % 7));
      }

      const timeMatch = taskText.match(/\bat\s(\d{1,2}):(\d{2})\s*(a\.m\.|p\.m\.)/i);
      if (timeMatch) {
        let [_, hours, minutes, period] = timeMatch;
        hours = parseInt(hours);
        if (period.toLowerCase() === "p.m." && hours !== 12) hours += 12;
        if (period.toLowerCase() === "a.m." && hours === 12) hours = 0;
        eventTime = `${hours.toString().padStart(2, "0")}:${minutes}`;
      }
    }

    const formatDate = (date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };
    const startDate = new Date(eventDate);
    const [hours, minutes] = eventTime.split(":");
    startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 1); // Assume 1-hour duration

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:${taskText}`,
      "DESCRIPTION:Task from Speech-to-Todo App",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${taskText.replace(/\s+/g, "_")}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col items-center p-6 min-h-screen bg-gray-100">
      <button
        onClick={() => {
          setIsListening(!isListening);
          if (!isListening) {
            setTranscript("");
            setTodoList([]);
          }
        }}
        className={`${
          isListening ? "bg-red-500" : "bg-blue-500"
        } text-white p-4 px-6 rounded-full flex items-center space-x-3 transition duration-300 transform hover:scale-105 shadow-lg`}
      >
        <span className="text-xl">🎤</span>
        <span className="font-semibold">{isListening ? "Listening..." : "Start Listening"}</span>
      </button>

      {/* 🎙️ Listening Area */}
      <div className="border border-gray-300 bg-white shadow-lg mt-6 p-6 w-[1100px] min-h-[160px] rounded-lg">
        <h2 className="text-xl font-bold mb-2 text-gray-700">🎙️ Listening Area</h2>
        <p className="text-gray-600">{transcript || "Start speaking..."}</p>
      </div>

      {/*Todo List */}
      <div className="border border-gray-300 bg-white shadow-lg mt-6 p-6 w-[1100px] min-h-[160px] rounded-lg">
        <h2 className="text-xl font-bold mb-2 text-gray-700">Todo List</h2>
        <ul className="list-disc ml-5 text-gray-600">
          {todoList.length > 0 ? (
            todoList.map((task, index) => (
              <li key={index} className="mt-2 flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-green-600 mr-2">❖</span>
                  {editingIndex === index ? (
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="border border-gray-300 rounded p-1 w-[500px]"
                      autoFocus
                    />
                  ) : (
                    <span>{task.text}</span>
                  )}
                </div>
                <div className="space-x-2">
                  {editingIndex === index ? (
                    <>
                      <button
                        onClick={() => handleUpdateSave(index)}
                        className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleUpdateCancel}
                        className="bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleUpdateStart(index)}
                        className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
                      >
                        Update
                      </button>
                      <button
                        onClick={() => handleDelete(index)}
                        className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => handleAddToCalendar(task.text)}
                        className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                      >
                        Add to Calendar
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))
          ) : (
            <span className="text-gray-400">No tasks yet</span>
          )}
        </ul>
        
      </div>

      <div className=" mt-6 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-2 text-gray-700">Developed by @Nitesh Giri</h2>
      </div>

    </div>
  );
};

export default App;