export type FetchTeeTimesState = {
  teeTimes: TeeTime[];
  error: string;
  isLoading: boolean;
};

export interface TeeTime {
    date: Date;
    courseName: string;
    openSlots: string;
    price?: number;
    golfAtxKey?: string;
}