'use client';
import { fetchTeeTimes } from "./actions";
import { useActionState } from "react";
import { useState } from "react";
import { TeeTimeTable } from "./components/teeTimeTable";

const courses = [
  {
    title: "Crystal Falls",
    key: "crystalFalls",
  },
  {
    title: "Shadow Glen",
    key: "shadowGlen",
  },
  {
    title: "Harvey Penick",
    key: "harveyPenick",
  },
  {
    title: "Falconhead",
    key: "falconhead",
  },
  {
    title: "Riverside",
    key: "riverside",
  },
  {
    title: "Avery Ranch",
    key: "averyRanch",
  },
  {
    title: "Teravista",
    key: "teravista",
  },
  {
    title: "Lions",
    key: "lions"
  },
  {
    title: "Morris Williams",
    key: "morrisWilliams"
  },
  {
    title: "Roy Kizer",
    key: "royKizer"
  },
  {
    title: "Jimmy Clay",
    key: "jimmyClay"
  }
];

export default function Home() {
  const [state, formAction, pending] = useActionState(fetchTeeTimes, { 
    teeTimes: [],
    error: "",
    isLoading: false,
  });

  const [ allSelected, setAllSelected ] = useState(false);

  return (
    <div>
      <form action={formAction} className="max-w-2xl rounded-lg border p-4 mt-4 mx-2 md:mx-auto">
        <div>
          <label htmlFor="date">Date:</label>
          <input id="date" name="date" type="date" required />
        </div>
        <fieldset disabled={allSelected} className={`flex flex-wrap my-4 ${allSelected ? "opacity-25" : ""}` }>
          {
            courses.map(({ title, key }) => {
              return (
                <div className="basis-1/3" key={key}>
                  <input className="mr-1" id={key} type="checkbox" value={key} name="courses" />
                  <label className="text-nowrap" htmlFor={key}>{title}</label>
                </div>
              )
            })
          }
        </fieldset>
        <div className="my-4 text-center">
          <input className="mr-1" id="all" type="checkbox" name="all" onChange={(e) => setAllSelected(e.target.checked)}/>
          <label htmlFor="all">All Courses</label>
        </div>
        <button className="p-2 border rounded-md w-full" disabled={pending} type="submit">{pending ? "Fetching Tee Times..." : "Find Tee Times"}</button>
      </form>
      {pending ?
        <></>
        :
        <TeeTimeTable data={state.teeTimes}/>
        // <div className="flex flex-wrap m-auto gap-4">
        //   {state.teeTimes.map(({ date, courseName, openSlots, price, bookingLink }) => {
        //     const formattedDate = formatDate(date);
        //     return (
        //       <div className="text-center p-4 border-2" key={`${date}-${courseName}-${price}`}>
        //         <h3 className="bold">{courseName}</h3>
        //         <h4>{formattedDate}</h4>
        //         <h4>{openSlots}</h4>
        //         { price && <h4>{price}</h4> }
        //         { bookingLink && <a target="_blank" href={bookingLink}><button>{price}</button></a> }
        //       </div>
        //     )
        //   })}
        // </div>  
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
// Teravista -  Foreup

// Harvey Penick - Teeitup
// Crystal Falls - Teeitup
// Shadowglen - Teeitup