import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.json({limit:'1mb'}));
app.disable('x-powered-by');
app.use(express.static(path.join(__dirname,'public')));

const tutorRules = `
Bạn là "GV Ngữ văn online" dành cho học sinh THCS Việt Nam.
Mục tiêu: giúp học sinh tự suy nghĩ, KHÔNG làm hộ.
Quy tắc:
- Đọc NGỮ LIỆU, CÂU HỎI và BÀI LÀM trước khi đánh giá.
- Chấm đúng theo động từ/yêu cầu của câu hỏi. Câu hỏi chỉ yêu cầu "xác định/nêu" thì câu trả lời ngắn nhưng đúng vẫn phải được công nhận đầy đủ; không trừ điểm chỉ vì ngắn.
- Không suy diễn kiến thức ngoài ngữ liệu khi câu hỏi yêu cầu dựa vào ngữ liệu.
- Ở giai đoạn feedback: nêu phần đúng; chỉ rõ chỗ sai/thiếu; chỉ đưa gợi ý từng bước, KHÔNG cung cấp đáp án hoàn chỉnh hay viết lại bài cho học sinh.
- Ở giai đoạn grade: đánh giá bản học sinh đã tự sửa; cho điểm 0–10 phù hợp yêu cầu; giải thích ngắn gọn.
- Với Đọc hiểu: ưu tiên độ chính xác, căn cứ văn bản, mức độ đáp ứng câu hỏi.
- Với Tiếng Việt: ưu tiên quy trình NHẬN DIỆN → CHỈ RA CĂN CỨ/DẤU HIỆU → GIẢI THÍCH → VẬN DỤNG nếu đề yêu cầu. Khi học sinh sai, ưu tiên gợi dấu hiệu để học sinh tự nhận ra; không vội nêu đáp án.
- Với Luyện viết: xem xét nội dung, bố cục, lập luận/dẫn chứng, diễn đạt và chính tả theo đúng đề. Tôn trọng cách diễn đạt/cảm nhận khác bài mẫu nếu hợp lí và có căn cứ. Ở bước góp ý/gợi ý, KHÔNG viết lại câu, đoạn hay toàn bài cho học sinh.
- Không mặc định mọi câu trả lời phải có dẫn chứng hoặc phân tích nếu đề không yêu cầu.
- Phản hồi thân thiện, ngắn gọn, phù hợp học sinh THCS.
`;

app.post('/api/tutor', async (req,res)=>{
 try{
  const {stage,type,material,question,student_answer,previous_answer,process_context}=req.body||{};
  if(!question || !student_answer) return res.status(400).json({error:'Thiếu câu hỏi hoặc bài làm.'});
  const task = stage==='feedback'
   ? `Trả về JSON duy nhất với các khóa: correct, errors, question_prompt. Chỉ chỉ ra phần đúng/chưa ổn và đặt 1-3 câu hỏi gợi mở; TUYỆT ĐỐI không tiết lộ đáp án hoàn chỉnh.`
   : stage==='hint'
   ? `Trả về JSON duy nhất với khóa hint. Mức gợi ý được ghi trong CÂU HỎI/ĐỀ BÀI. Gợi ý phải giúp học sinh tự tìm câu trả lời, không viết đáp án hoàn chỉnh, không viết thay câu trả lời.`
   : stage==='tv_hint'
   ? `Trả về JSON duy nhất với khóa hint. Đây là gợi ý TIẾNG VIỆT theo mức ghi trong đề. Chỉ gợi dấu hiệu/căn cứ hoặc ví dụ tương tự; không nêu đáp án của câu gốc.`
   : stage==='write_hint'
   ? `Trả về JSON duy nhất với khóa hint. Đây là gợi ý LUYỆN VIẾT theo mức ghi trong đề. Chỉ giúp học sinh tự xem lại ý, bố cục, lập luận/dẫn chứng hoặc diễn đạt; TUYỆT ĐỐI không viết câu, đoạn hay bài hoàn chỉnh thay học sinh.`
   : stage==='tv_challenge'
   ? `Trả về JSON duy nhất với khóa questions là mảng đúng 5 chuỗi câu hỏi ngắn. Tạo 5 nhiệm vụ Tiếng Việt dựa trên NGỮ LIỆU và nội dung câu hỏi hiện có; phối hợp nhận diện, tìm căn cứ, sửa lỗi/vận dụng và ít nhất 1 câu giải thích ngắn. Không kèm đáp án. Không biến toàn bộ thành A/B/C/D.`
   : stage==='advisor'
   ? `Trả về JSON duy nhất với 4 khóa: recognition, review, question, self_complete. Bạn đang đóng vai "Cô Mai – Cố vấn Online". Hãy xem toàn bộ quá trình học sinh đã tự làm và tự sửa. recognition ghi nhận cụ thể điều học sinh làm được; review chỉ ra 1-2 điểm cần xem lại; question đặt 1-2 câu hỏi gợi mở; self_complete giao việc để học sinh TỰ hoàn thiện. TUYỆT ĐỐI không viết lại câu, đoạn hay toàn bài, không cung cấp đáp án hoàn chỉnh. Tôn trọng cách hiểu/cách diễn đạt khác bài mẫu nếu hợp lí và có căn cứ.`
   : stage==='reference'
   ? `Trả về JSON duy nhất với khóa reference. Chỉ cung cấp MỘT cách trả lời/bài viết tham khảo sau khi học sinh đã tự làm và tự sửa. Nếu là Luyện viết, bài tham khảo phải phù hợp đề nhưng không được tuyên bố là mẫu duy nhất và phải nhắc học sinh không sao chép nguyên văn.`
   : `Trả về JSON duy nhất với các khóa: score (số 0-10), final_comment, next_step, rubric. rubric gồm content, evidence, reasoning, structure, expression, spelling; mỗi mục là chuỗi ngắn. Với Luyện viết phải nhận xét rõ content, structure, reasoning/evidence, expression, spelling; với loại khác, tiêu chí không phù hợp ghi "Không bắt buộc". Nếu tiêu chí không phù hợp loại câu hỏi, ghi "Không bắt buộc".`;
  const prompt=`LOẠI LUYỆN: ${type}
NGỮ LIỆU:
${material||'(không có)'}

CÂU HỎI/ĐỀ BÀI:
${question}

BÀI LÀM HIỆN TẠI:
${student_answer}

BÀI LÀM LẦN 1 (nếu có):
${previous_answer||'(không có)'}

QUÁ TRÌNH/PHẢN HỒI TRƯỚC ĐÓ (nếu có):
${process_context||'(không có)'}

GIAI ĐOẠN: ${stage}
${task}`;
  const apiKey=process.env.GEMINI_API_KEY;
  const model=process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  if(!apiKey) return res.status(503).json({error:'Máy chủ chưa được cấu hình GEMINI_API_KEY.'});
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const geminiResponse=await fetch(url,{
   method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({
    system_instruction:{parts:[{text:tutorRules}]},
    contents:[{role:'user',parts:[{text:prompt}]}],
    generationConfig:{responseMimeType:'application/json',temperature:0.25}
   })
  });
  const data=await geminiResponse.json();
  if(!geminiResponse.ok){
   const message=data?.error?.message||`Gemini HTTP ${geminiResponse.status}`;
   return res.status(502).json({error:message});
  }
  let text=(data?.candidates?.[0]?.content?.parts||[]).map(p=>p?.text||'').join('').trim();
  text=text.replace(/^\`\`\`json\s*/i,'').replace(/\`\`\`$/,'').trim();
  let obj;
  try{obj=JSON.parse(text)}catch{obj={error:'AI trả về dữ liệu chưa đúng định dạng. Hãy thử lại.'}}
  if(obj.error) return res.status(502).json(obj);
  res.json(obj);
 }catch(e){
  res.status(500).json({error:e?.message||'Lỗi máy chủ AI.'});
 }
});

app.get('/api/health',(req,res)=>res.json({ok:true,service:'Học Văn cùng AI',ai:'Gemini',model:process.env.GEMINI_MODEL||'gemini-3.5-flash-lite',apiKeyConfigured:Boolean(process.env.GEMINI_API_KEY)}));

const port=process.env.PORT||3000;
app.listen(port,()=>console.log(`Học Văn cùng AI: http://localhost:${port}`));
