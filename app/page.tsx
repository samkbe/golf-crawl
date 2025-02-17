'use client';
import { fetchTeeTimes } from "./actions";
import { useActionState } from "react";
import { FetchTeeTimesState } from "./types";

export default function Home() {
  const [state, formAction, pending] = useActionState(fetchTeeTimes, { 
    teeTimes: [], 
    error: "",
    isLoading: false,
  });

  return (
    <div>
      <form action={formAction}>
        <label htmlFor="date">Date:</label>
        <input id="date" name="date" type="date" required />
        <button disabled={pending} type="submit">{pending ? "Fetching Tee Times..." : "Find Tee Times"}</button>
      </form>
      {pending ?
        <h1>Loading Tee Times...</h1>
        :
        <div className="flex flex-wrap m-auto gap-4">
          {state.teeTimes.map(({ date, courseName, openSlots }) => {

            const formattedDate = new Intl.DateTimeFormat("en-US", {
              timeZone: "America/Chicago", // CST time zone
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true, // Ensures AM/PM format
            }).format(new Date(date));

            return (
              <div className="text-center p-4 border-2">
                <h3>{courseName}</h3>
                <h4>{formattedDate}</h4>
                <h4>{openSlots}</h4>
              </div>
            )
          })}
        </div>  
      }
    </div>
  );
}
