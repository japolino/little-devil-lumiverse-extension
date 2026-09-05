// Offline scope/branch checks. Compatibility macros use the shipped backend.
// This is not a provider-channel integration test or a full Lumiverse renderer.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const root=require('path').resolve(__dirname,'..');
const file='little-devil-v16-gem3.1-lumiverse.preset.json';
const after=JSON.parse(fs.readFileSync(root+'/'+file,'utf8'));
const macros=new Map();
vm.runInNewContext(fs.readFileSync(root+'/dist/backend.js','utf8'),{spindle:{registerMacro:d=>macros.set(d.name,d),onFrontendMessage:()=>{}},console});
const truth=v=>['true','1'].includes(String(v).toLowerCase());
function tokens(text){
 let out=[],pos=0;
 while(pos<text.length){let start=text.indexOf('{{',pos);if(start<0){out.push({text:text.slice(pos)});break;}
 if(start>pos)out.push({text:text.slice(pos,start)});
 let depth=1,end=start+2;while(depth&&end<text.length){if(text.startsWith('{{',end)){depth++;end+=2;}else if(text.startsWith('}}',end)){depth--;end+=2;}else end++;}
 assert.equal(depth,0);out.push({macro:text.slice(start+2,end-2)});pos=end;
 }return out;
}
function render(text,vars){
 function scalar(s){return tokens(s).map(t=>t.text!==undefined?t.text:evalMacro(t.macro)).join('');}
 function evalMacro(m){
 let parts=[],part='',depth=0;for(let i=0;i<m.length;){if(m.startsWith('{{',i)){depth++;part+='{{';i+=2;}else if(m.startsWith('}}',i)){depth--;part+='}}';i+=2;}else if(!depth&&m.startsWith('::',i)){parts.push(part);part='';i+=2;}else part+=m[i++];}parts.push(part);
 const name=parts.shift(),args=parts.map(scalar);
 if(macros.has(name))return String(macros.get(name).handler({args}));
 if(name==='var'||name==='getvar')return String(vars[args[0]]??'');
 if(name==='eq')return args[0]===args[1]?'1':'0';
 if(name==='ne')return args[0]!==args[1]?'1':'0';
 if(name==='gt')return Number(args[0])>Number(args[1])?'1':'0';
 if(name==='setvar'){vars[args[0]]=args[1];return '';}
 return '{{'+m+'}}';
 }
 const ts=tokens(text);let index=0;
 function seq(stop=false){let out='';while(index<ts.length){const t=ts[index++];if(t.text!==undefined){out+=t.text;continue;}
 if(t.macro==='else'||t.macro==='/unless'){assert(stop);return {out,end:t.macro};}
 if(t.macro.startsWith('unless::')){const keep=!truth(scalar(t.macro.slice(8)));const yes=seq(true);let no={out:''};if(yes.end==='else')no=seq(true);assert.equal((yes.end==='else'?no:yes).end,'/unless');out+=keep?yes.out:no.out;}
 else out+=evalMacro(t.macro);
 }assert(!stop);return {out};}return seq().out;
}
function defaults(p){let vars={};for(const b of p.preset.blocks)for(const v of b.variables||[])vars[v.name]=v.defaultValue;for(const v of Object.values(p.preset.promptVariables))Object.assign(vars,v);return vars;}
function block(p,i,over={}){return render(p.preset.blocks[i].content,{...defaults(p),...over});}
const reasoning=after.preset.blocks.findIndex(b=>b.name==='# Reasoning Guidelines C0T');
const template=after.preset.blocks.findIndex(b=>b.name==='# Response Template');
assert(reasoning>=0&&template>=0);
for(const b of after.preset.blocks)if(b.content)render(b.content,defaults(after));
let reasoningCases=0;
for(let response_mode=0;response_mode<5;response_mode++)for(let model=0;model<4;model++)for(let fthink=0;fthink<4;fthink++)for(let cot=0;cot<5;cot++){
 const v={response_mode,model,fthink,cot};
 const text=block(after,reasoning,v);
 assert(text.includes('Do not output the reasoning process'));
 assert(text.includes('If native thinking is unavailable'));
 assert(!text.includes('```'));
 assert.equal(text.includes('## Final Review'),response_mode<3&&cot===1);
 assert.equal(text.includes('## Narrative Enhancement'),response_mode<3&&cot===2);
 assert.equal(text.includes('## Canon Review'),response_mode<3&&cot===3);
 assert.equal(text.includes('## Mature-Scene Review'),response_mode<3&&cot===4);
 assert(!block(after,template,v).includes('<Thoughts>'));
 reasoningCases++;
}
let povCases=0;
for(let response_mode=0;response_mode<5;response_mode++)for(let writing_perspective=0;writing_perspective<8;writing_perspective++)for(let cot=0;cot<5;cot++)for(const pov_char of ['', 'Alice'])for(const cam_char of ['', 'Bob']){
 const text=block(after,reasoning,{response_mode,writing_perspective,cot,pov_char,cam_char});
 const narrative=response_mode<3;
 assert.equal(text.includes('first-person perspective of Alice'),narrative&&!!pov_char);
 assert.equal(text.includes('information that Bob cannot obtain will be omitted from this process'),narrative&&!!cam_char);
 assert.equal(text.includes("{{char}}'s first-person perspective"),narrative&&!pov_char&&!cam_char&&writing_perspective===1);
 assert.equal(text.includes("{{user}}'s first-person perspective"),narrative&&!pov_char&&!cam_char&&writing_perspective===2);
 povCases++;
}
let templateCases=0;
for(let response_mode=0;response_mode<5;response_mode++)for(let response_language=0;response_language<4;response_language++)for(let endover=0;endover<2;endover++)for(let timenow=0;timenow<2;timenow++){
 const text=block(after,template,{response_mode,response_language,endover,timenow});
 assert.equal(/^## .+ \{Number\}: \{Title\}/m.test(text),response_mode===0&&endover===1);
 assert.equal(text.includes('Include a clock'),response_mode<2&&timenow===0);
 assert.equal(text.includes('At the start of every scene'),response_mode<2&&timenow===0);
 assert(!text.includes('Chatindex'));
 templateCases++;
}
const definitions=after.preset.blocks.flatMap(b=>b.variables||[]);
const serialized=JSON.stringify(after);
for(const removed of ['volume_chapter','timestamps']){
 assert(!definitions.some(v=>v.name===removed));
 assert(!serialized.includes('{{var::'+removed+'}}'));
 assert(!Object.values(after.preset.promptVariables).some(v=>Object.hasOwn(v,removed)));
}
assert.equal(definitions.filter(v=>v.name==='endover').length,1);
assert.equal(definitions.filter(v=>v.name==='timenow').length,1);
assert.equal(defaults(after).endover,0);
assert.equal(defaults(after).timenow,0);
const guidelines=after.preset.blocks.findIndex(b=>b.name==='# Guidelines');
const feedback=after.preset.blocks.findIndex(b=>b.name==='# Feedback');
for(let endover=0;endover<2;endover++)for(let story_speed=0;story_speed<5;story_speed++){
 const v={endover,story_speed,response_mode:0};
 const guide=block(after,guidelines,v),review=block(after,feedback,v);
 assert.equal(guide.includes('Each volume consists of 10-15 chapters'),!!endover);
 assert.equal(guide.includes('When the volume is fully developed'),!!endover);
 assert.equal(review.includes('Volume Structure:'),!!endover);
 assert.equal(review.includes('Volume End Format:'),!!endover);
 assert.equal(guide.includes('Insert timestamps per scene'),true);
 assert.equal(block(after,guidelines,{...v,timenow:1}).includes('Insert timestamps per scene'),false);
}
console.log(`PASS: balanced macro scopes; ${reasoningCases} reasoning, ${povCases} POV, ${templateCases} template combinations.`);
