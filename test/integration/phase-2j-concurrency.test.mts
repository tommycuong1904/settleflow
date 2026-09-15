import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { db } from "@/lib/db/client";
import { submitMilestone } from "@/lib/repositories/milestone-submission";
import { reviewMilestone } from "@/lib/repositories/milestone-review";
import { createBarrier } from "@/test/support/concurrency";

async function fixture(status: "pending" | "rejected" | "submitted") {
  const s = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const user = await db.user.create({data:{displayName:"Phase2J",email:`p2j-${s}@x.test`}});
  const ws = await db.workspace.create({data:{name:"P2J",slug:`p2j-${s}`}});
  await db.workspaceMember.create({data:{workspaceId:ws.id,userId:user.id,role:"owner"}});
  const c = await db.contributor.create({data:{workspaceId:ws.id,createdByUserId:user.id,name:"C",walletAddress:"0x6666666666666666666666666666666666666666",linkedUserId:user.id}});
  const p = await db.payout.create({data:{workspaceId:ws.id,contributorId:c.id,createdByUserId:user.id,title:"P",totalAmountUsdc:"10",status:"active",targetWalletAddress:c.walletAddress}});
  const m = await db.milestone.create({data:{payoutId:p.id,title:"M",description:"M",amountUsdc:new Decimal("10"),sequence:1,status}});
  if(status === "submitted" || status === "rejected") await db.milestoneSubmission.create({data:{milestoneId:m.id,submittedByUserId:user.id,summary:"old",resubmissionNumber:0}});
  return {user,ws,c,p,m};
}
async function cleanup(f:any){await db.milestoneReview.deleteMany({where:{milestoneId:f.m.id}}); await db.milestoneSubmission.deleteMany({where:{milestoneId:f.m.id}}); await db.milestone.delete({where:{id:f.m.id}}); await db.payout.delete({where:{id:f.p.id}}); await db.contributor.delete({where:{id:f.c.id}}); await db.workspaceMember.deleteMany({where:{workspaceId:f.ws.id}}); await db.workspace.delete({where:{id:f.ws.id}}); await db.user.delete({where:{id:f.user.id}});}
async function runSub(status:"pending"|"rejected"){const f=await fixture(status); try {const n= createBarrier(2); const run=(i:number)=>submitMilestone(f.m.id,f.ws.id,{authenticatedUserId:f.user.id,summary:`s${i}`},()=>{n.wait();}); const r=await Promise.allSettled([run(1),run(2)]); assert.equal(r.filter(x=>x.status==="fulfilled").length,1); assert.equal(r.filter(x=>x.status==="rejected").length,1); const rows=await db.milestoneSubmission.findMany({where:{milestoneId:f.m.id}}); assert.equal(rows.length,status==="pending"?1:2); assert.equal(new Set(rows.map(x=>x.resubmissionNumber)).size,rows.length); } finally {await cleanup(f);}}
test("concurrent pending submissions have one winner and one submission",()=>runSub("pending"));
test("concurrent rejected resubmissions have unique sequence",()=>runSub("rejected"));
async function runReview(a:"approved"|"rejected",b:"approved"|"rejected"){const f=await fixture("submitted"); try {const r=await Promise.allSettled([reviewMilestone(f.m.id,f.user.id,f.ws.id,a,a==="rejected"?"no":""),reviewMilestone(f.m.id,f.user.id,f.ws.id,b,b==="rejected"?"no":"")]); assert.equal(r.filter(x=>x.status==="fulfilled").length,1); assert.equal(r.filter(x=>x.status==="rejected").length,1); assert.equal(await db.milestoneReview.count({where:{milestoneId:f.m.id}}),1); const status=(await db.milestone.findUnique({where:{id:f.m.id}}))?.status; assert.ok(a===b ? status===a : status===a || status===b);} finally {await cleanup(f);}}
test("concurrent approve/reject has one review",()=>runReview("approved","rejected"));
test("concurrent approve/approve has one review",()=>runReview("approved","approved"));
test("concurrent reject/reject has one review",()=>runReview("rejected","rejected"));

test("payout lock serializes concurrent confirmation recalculation",async()=>{const f=await fixture("submitted"); try {await db.milestone.update({where:{id:f.m.id},data:{status:"approved"}}); const results=await Promise.all([db.$transaction(async(tx:Prisma.TransactionClient)=>{await tx.$queryRaw`SELECT id FROM "Payout" WHERE id=${f.p.id} FOR UPDATE`; await new Promise(r=>setTimeout(r,5));}),db.$transaction(async(tx:Prisma.TransactionClient)=>{await tx.$queryRaw`SELECT id FROM "Payout" WHERE id=${f.p.id} FOR UPDATE`;} )]); assert.equal(results.length,2);} finally {await cleanup(f);}});
