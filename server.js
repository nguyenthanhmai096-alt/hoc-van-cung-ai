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
- Trước khi cho điểm, bắt buộc đối chiếu BÀI LÀM HIỆN TẠI với NGỮ LIỆU, CÂU HỎI và QUÁ TRÌNH/PHẢN HỒI TRƯỚC ĐÓ. Không được cho điểm tối đa nếu bài hiện tại vẫn giữ nguyên lỗi kiến thức hoặc mâu thuẫn với chính phản hồi trước đó.
- Nếu phản hồi trước đó đã yêu cầu học sinh xem lại một nhận định mà bài sửa vẫn giữ nguyên nhận định ấy nhưng chưa bổ sung căn cứ thuyết phục, phải tiếp tục đánh dấu là cần xem lại; không được tự đảo ngược kết luận chỉ để hợp thức hóa bài làm.
- Không suy ra rằng một từ xuất hiện lặp lại tự động là "điệp ngữ"; phải xét đúng dấu hiệu của biện pháp tu từ trong cấu trúc ngữ liệu.
- Phải phân biệt chính xác "điệp từ" (lặp từ), "điệp ngữ" (lặp từ/cụm từ/cấu trúc có dụng ý) và "đối/tiểu đối" (hai vế có cấu trúc tương ứng, cân xứng). Nếu câu trả lời của học sinh gọi sai hoặc gọi chưa chính xác tên biện pháp, phải nói rõ "đúng một phần/chưa chính xác", tuyệt đối không mở đầu bằng "Em xác định đúng".
- final_comment, score và rubric phải cùng một kết luận. Nếu final_comment nói biện pháp học sinh nêu chưa chính xác hoặc còn lỗi kiến thức trọng tâm thì rubric.content không được ghi "chính xác/đúng yêu cầu" và điểm tổng không được ở mức 8–10.
- Với câu hỏi xác định biện pháp tu từ, trước khi chấm hãy phân tích dấu hiệu trực tiếp trong ngữ liệu rồi mới so sánh với câu trả lời học sinh. Không chấm theo hướng hợp thức hóa câu trả lời của học sinh.
- KHÔNG được tự coi kiến thức do mô hình nhớ được là "nguồn kiểm chứng". Nếu NGỮ LIỆU/QUÁ TRÌNH không chứa trích dẫn SGK, tài liệu giáo viên hoặc căn cứ học liệu đủ rõ để phân xử một thuật ngữ có thể có nhiều cách gọi, không được khẳng định tuyệt đối kiểu "chỉ là X, không phải Y".
- Khi một ngữ liệu có thể đồng thời thể hiện nhiều thủ pháp (ví dụ lặp từ và cấu trúc cân xứng/đối), hãy tách rõ từng DẤU HIỆU quan sát được, nói mức độ chắc chắn, và yêu cầu học sinh kiểm chứng tên gọi theo SGK/tài liệu giáo viên ở Bước 7. Không tự bịa tên bài, trang hay nội dung SGK.
- Chỉ được bác bỏ dứt khoát một cách gọi khi có căn cứ rõ ngay trong ngữ liệu theo định nghĩa không tranh chấp, hoặc khi QUÁ TRÌNH/PHẢN HỒI TRƯỚC ĐÓ có nguồn học liệu được cung cấp rõ ràng.
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
   : `Trước khi chấm, hãy thực hiện kiểm tra nhất quán nội bộ: (1) xác định chính xác yêu cầu câu hỏi; (2) đối chiếu câu trả lời với ngữ liệu; (3) đọc QUÁ TRÌNH/PHẢN HỒI TRƯỚC ĐÓ và kiểm tra học sinh đã thực sự sửa điểm được nhắc hay chưa; (4) chỉ sau đó mới cho điểm. Nếu bài làm vẫn chứa lỗi kiến thức đã được cảnh báo trước đó và lỗi đó đã có căn cứ chắc chắn, không được cho 8-10 điểm. Nếu việc phân loại thuật ngữ chưa có nguồn học liệu đủ rõ, không được tự kết luận học sinh sai chỉ vì mô hình ưu tiên một tên gọi khác; hãy chấm phần chắc chắn từ ngữ liệu và ghi rõ nội dung cần kiểm chứng ở Bước 7. Nếu tên biện pháp tu từ học sinh nêu chỉ đúng một phần/chưa chính xác theo căn cứ đã có, final_comment phải nói rõ điều đó và rubric.content phải phản ánh cùng kết luận; không được dùng các câu như "đã xác định đúng", "chính xác", "đáp ứng đúng yêu cầu". Trả về JSON duy nhất với các khóa: score (số 0-10), final_comment, next_step, rubric. rubric gồm content, evidence, reasoning, structure, expression, spelling; mỗi mục là chuỗi ngắn. Với Luyện viết phải nhận xét rõ content, structure, reasoning/evidence, expression, spelling; với loại khác, tiêu chí không phù hợp ghi "Không bắt buộc". Nếu tiêu chí không phù hợp loại câu hỏi, ghi "Không bắt buộc".`;
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
