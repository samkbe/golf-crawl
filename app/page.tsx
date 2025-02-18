'use client';
import { fetchTeeTimes } from "./actions";
import { useActionState } from "react";

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
            const formattedDate = formatDate(date);
            return (
              <div className="text-center p-4 border-2">
                <h3 className="bold">{courseName}</h3>
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


function formatDate(date: Date) : string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}


// Golf ATX - Random
// Forrest Creek - ChronoGolf
// Falconhead - Foreup
// Riverside - Foreup
// Avery Ranch - Foreup
// Harvey Penick - Teeitup
// Crystal Falls - Teeitup
// Shadowglen - Teeitup

//BUGS
// Need to actually use the date argument in golfatx scraping function