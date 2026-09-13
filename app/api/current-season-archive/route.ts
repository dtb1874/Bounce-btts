import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request:Request){
 const authorization=request.headers.get("authorization")??"";const accessToken=authorization.startsWith("Bearer ")?authorization.slice(7):"";if(!accessToken)return NextResponse.json({error:"Unauthorized"},{status:401});
 const admin=createAdminClient();const{data:{user},error:authError}=await admin.auth.getUser(accessToken);if(authError||!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const{data:profile}=await admin.from("profiles").select("id,approved,active").eq("id",user.id).maybeSingle();if(!profile?.approved||!profile.active)return NextResponse.json({error:"Forbidden"},{status:403});
 const[{data:season},{data:profiles}]=await Promise.all([admin.from("seasons").select("id,label").eq("is_current",true).maybeSingle(),admin.from("profiles").select("id,display_name,role,active").eq("approved",true).eq("active",true).neq("role","guest").order("slot_number")]);
 if(!season?.id)return NextResponse.json({season:null,gameweeks:[],profiles:profiles??[],predictions:[],fixtures:[]});
 const{data:gameweeks}=await admin.from("gameweeks").select("id,number,status,locks_at").eq("season_id",season.id).order("number");const gameweekIds=(gameweeks??[]).map(row=>row.id);
 let predictions:any[]=[];if(gameweekIds.length){const response=await admin.from("predictions").select("gameweek_id,member_id,fixture_id,points_awarded").in("gameweek_id",gameweekIds);predictions=response.data??[]}
 const fixtureIds=Array.from(new Set(predictions.map(row=>row.fixture_id).filter(Boolean)));let fixtures:any[]=[];if(fixtureIds.length){const response=await admin.from("fixtures").select("id,home_team,away_team,home_score,away_score,status,odds_fractional,odds_deadline_fractional").in("id",fixtureIds);fixtures=response.data??[]}
 return NextResponse.json({season,gameweeks:gameweeks??[],profiles:profiles??[],predictions,fixtures});
}
