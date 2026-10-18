import test from 'node:test';import assert from 'node:assert/strict';import{initialCases,assess,addEvidence,draftPack}from'./cases.js';
test('RF-1042 has $240 potential, $90 excluded and $330 total',()=>{const c=initialCases[0],a=assess(c);assert.equal(a.potential,240);assert.equal(c.labour,90);assert.equal(c.parts+c.labour,330);assert.equal(a.status,'Needs evidence');assert.equal(a.expires,'2027-02-10');assert.equal(c.evidence.find(e=>e.name==='Serial-number photograph').present,false)});
test('simulated evidence completes checklist without changing review or submission',()=>{const c=addEvidence(initialCases[0],'Serial-number photograph');assert.equal(assess(c).status,'Ready for review');assert.equal(c.review,'Not reviewed');assert.equal(c.evidence[3].simulated,true);const pack=draftPack(c);assert.match(pack,/Not submitted/);assert.match(pack,/No recovery received/);assert.match(pack,/SIMULATED RECORD/);assert.equal(initialCases[0].evidence[3].present,false)});
test('expired coverage remains distinct from unknown eligibility',()=>{assert.equal(assess(initialCases[1]).status,'Outside coverage');assert.equal(assess(initialCases[1]).potential,null);assert.equal(assess(initialCases[2]).status,'Eligibility unknown');assert.equal(assess(initialCases[2]).potential,null);assert.equal(assess(addEvidence(initialCases[2],'Parts invoice')).potential,125)});
test('draft export preserves state and labels fictional terms and excluded labour',()=>{const c=structuredClone(initialCases[0]),before=JSON.stringify(c),pack=draftPack(c);assert.match(pack,/SAMPLE DRAFT/);assert.match(pack,/Fictional/);assert.match(pack,/Excluded labour: \$90/);assert.match(pack,/Potential parts recovery: \$240/);assert.match(pack,/Missing: Serial-number photograph/);assert.equal(JSON.stringify(c),before)});

test('all cases keep supplier outcomes unchanged through evidence additions and export',()=>{
  for(const original of initialCases){
    let c=structuredClone(original);
    for(const evidence of original.evidence){
      c=addEvidence(c,evidence.name);
      assert.equal(c.review,original.review);
      assert.equal(c.reviewer,original.reviewer);
      assert.ok(['Ready for review','Needs evidence','Outside coverage','Eligibility unknown'].includes(assess(c).status));
      for(const field of ['submitted','supplierApproved','paid','recovered'])assert.equal(c[field],original[field]);
      const before=structuredClone(c);
      const pack=draftPack(c);
      assert.deepEqual(c,before);
      assert.match(pack,/SAMPLE DRAFT CLAIM PACK/);
      assert.match(pack,/Not submitted\. No recovery received\./);
      assert.match(pack,/Evidence completeness is not supplier approval/);
    }
    if(original.id==='RF-1043')assert.equal(assess(c).status,'Outside coverage');
  }
});
