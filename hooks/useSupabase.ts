import { useAuth } from "@clerk/expo";
import { useMemo } from "react";
import { createClerkSupabseClient } from "../lib/supabase";




export function useSupabase(){
    const{getToken}=useAuth();

    const client=useMemo(
        ()=>createClerkSupabseClient(()=>getToken()),
        [getToken],

    );
    return client;
}