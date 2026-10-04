import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const tutorRules = `
Bạn là "GV Ngữ văn online" dành cho học sinh THCS Việt Nam.

MỤC TIÊU CỐT LÕI:
TỰ SUY NGHĨ → AI CHỈ LỖI → AI GỢI MỞ → HỌC SINH TỰ SỬA → AI CHẤM → KIỂM CHỨNG → TỰ QUYẾT ĐỊNH.
AI tuyệt đối không làm bài thay học sinh.

NGUYÊN TẮC CHUYÊN MÔN:
1. Luôn đọc đủ NGỮ LIỆU, CÂU HỎI/ĐỀ BÀI và BÀI LÀM trước khi phản hồi.
2. Phân tích đúng động từ yêu cầu: xác định/chỉ ra/nêu; giải thích/lí giải; phân tích; nhận xét; so sánh; viết đoạn/bài.
3. Nếu đề chỉ yêu cầu xác định/chỉ ra/nêu: câu ngắn nhưng chính xác có thể đạt tối đa; không ép dẫn chứng/lập luận không cần thiết. Chấp nhận các cách gọi tương đương, thông dụng trong chương trình THCS khi bản chất hiện tượng đúng (ví dụ: “điệp từ” khi một từ được lặp lại; không được kết luận sai chỉ vì ưu tiên nhãn “điệp ngữ”).
4. Nếu đề yêu cầu tác dụng/giải thích/phân tích: học sinh phải nêu được căn cứ trong ngữ liệu và tác dụng/ý nghĩa cụ thể trong ngữ cảnh, tránh nhận xét chung chung.
5. Đọc hiểu: bám sát từ ngữ, hình ảnh, chi tiết, mạch văn và yêu cầu đề; không suy diễn ngoài văn bản.
6. Tiếng Việt: nhận diện đúng khái niệm + chỉ đúng dấu hiệu/từ ngữ + giải thích tác dụng trong ngữ cảnh khi đề yêu cầu.
7. Luyện viết: bám đề, luận điểm/ý chính, bố cục, lập luận, dẫn chứng, liên kết, diễn đạt; không viết hộ.
8. Gợi ý phải theo tầng, từ nhẹ đến sâu. Mỗi tầng phải cụ thể với chính ngữ liệu/câu hỏi đang làm, nhưng không tiết lộ đáp án hoàn chỉnh.
9. Khi học sinh hỏi "Vì sao em chưa đúng?", phải chỉ rõ: em đang hiểu đúng gì, sai/thiếu chính xác ở chữ/ý nào, căn cứ nào cần nhìn lại, và đặt 1 câu hỏi gợi mở để em tự sửa.
10. Không khen chung chung. Không chấm máy móc. Không mặc định 10/10 chỉ vì câu trả lời có vẻ đúng ý.
11. Khi chấm, chỉ đánh giá những tiêu chí thực sự được đề yêu cầu. Điểm phải tương xứng mức độ hoàn thành yêu cầu.
12. Nếu có NGỮ LIỆU, mọi nhận định về dẫn chứng phải kiểm tra đúng nguyên văn/ngữ nghĩa từ ngữ liệu. Không bịa trích dẫn.
13. Đáp án tham khảo chỉ xuất hiện sau kiểm chứng, phải bám sát đề/ngữ liệu, và ghi rõ đây là một cách trả lời tham khảo.
14. Phản hồi rõ ràng, vừa sức THCS, đủ sâu để học sinh tiến bộ nhưng không dài dòng.
`;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Chưa tìm thấy GEMINI_API_KEY trong file .env.');
  }

  const model = 'gemini-3.5-flash-lite';

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  let lastError = null;

  // Nếu Gemini quá tải, tự thử tối đa 3 lần.
  for (let attempt = 1; attempt <= 3; attempt++) {

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      })
    });

    const data = await response.json();

    if (response.ok) {
      return data;
    }

    lastError = {
      status: response.status,
      message: data?.error?.message || 'Gemini API báo lỗi.'
    };

    console.log(
      `Gemini lần ${attempt} chưa thành công:`,
      lastError.status,
      lastError.message
    );

    // 429 = giới hạn tạm thời; 500/502/503/504 = dịch vụ tạm thời không sẵn sàng.
    const retryable = [429, 500, 502, 503, 504].includes(response.status);

    if (!retryable || attempt === 3) {
      break;
    }

    // Chờ lâu dần: 2 giây, rồi 4 giây.
    await wait(attempt * 2000);
  }

  if (lastError?.status === 503) {
    throw new Error(
      'AI đang có nhiều người sử dụng cùng lúc. Em hãy chờ một chút rồi bấm "AI xem bài" lại nhé.'
    );
  }

  if (lastError?.status === 429) {
    throw new Error(
      'AI đang tạm giới hạn số lượt sử dụng. Em hãy chờ một chút rồi thử lại nhé.'
    );
  }

  throw new Error(
    lastError?.message || 'Chưa thể kết nối với AI. Em hãy thử lại sau.'
  );
}

app.post('/api/tutor', async (req, res) => {
  try {
    const { stage, type, material, question, student_answer, previous_answer, process_context } = req.body || {};
    if (!question || !student_answer) {
      return res.status(400).json({ error: 'Em cần nhập câu hỏi và bài làm trước khi gửi AI xem bài.' });
    }

    const context = `
LOẠI LUYỆN TẬP: ${type || 'Không xác định'}
NGỮ LIỆU:
${material || '(không có)'}
CÂU HỎI/ĐỀ BÀI:
${question}
BÀI LÀM HIỆN TẠI:
${student_answer}
BÀI LÀM LẦN 1:
${previous_answer || '(không có)'}
NGỮ CẢNH QUÁ TRÌNH:
${process_context || '(không có)'}
`;

    let task = '';

    if (stage === 'feedback') {
      task = `
NHIỆM VỤ: BƯỚC 2 - AI CHỈ LỖI.
Trả JSON:
{
 "correct":"Nói cụ thể học sinh đã làm đúng gì, bám đúng yêu cầu nào.",
 "errors":"Chỉ rõ chỗ sai, thiếu, chung chung hoặc chưa bám yêu cầu; nếu không sai thì nói phần nào có thể làm chính xác/sâu hơn. Không bắt lỗi thuật ngữ khi học sinh dùng cách gọi tương đương và đúng bản chất (ví dụ điệp từ/điệp ngữ trong trường hợp lặp từ).",
 "question_prompt":"Một câu hỏi gợi mở trực tiếp giúp học sinh tự phát hiện điều cần sửa.",
 "hint":"Một gợi ý mức nhẹ, không có đáp án hoàn chỉnh."
}
Không viết lại câu trả lời cho học sinh. Không đưa đáp án hoàn chỉnh.
`;
    } else if (['hint','tv_hint','write_hint'].includes(stage)) {
      task = `
NHIỆM VỤ: BƯỚC 3 - AI GỢI Ý THEO YÊU CẦU CỤ THỂ ĐƯỢC GHI TRONG CÂU HỎI.
Trả JSON:
{
 "hint":"Gợi ý cụ thể, có chiều sâu, bám chính ngữ liệu và yêu cầu đề. Chỉ dẫn học sinh nên nhìn vào đâu, suy luận theo bước nào, và kết thúc bằng 1 câu hỏi để học sinh tự trả lời.",
 "question":"Một câu hỏi gợi mở tiếp theo."
}
Nếu học sinh hỏi vì sao mình chưa đúng: giải thích rõ phần đúng → phần chưa chuẩn → căn cứ cần xem lại → câu hỏi tự sửa.
Nếu là gợi ý mức 1: chỉ định hướng.
Mức 2: chỉ rõ dấu hiệu/chi tiết cần xem.
Mức 3: hướng dẫn cách lập luận/cách trình bày và có thể cho ví dụ TƯƠNG TỰ, nhưng tuyệt đối không viết đáp án của chính câu đang làm.
Không trả lời qua loa kiểu "hãy đọc lại ngữ liệu".
`;
    } else if (stage === 'grade') {
      task = `
NHIỆM VỤ: BƯỚC 5 - CHẤM BÀI SAU KHI HỌC SINH TỰ SỬA.
Trả JSON:
{
 "score":0,
 "final_comment":"Nhận xét chính xác mức độ đáp ứng yêu cầu đề.",
 "improved":"Điểm đã sửa đúng/tiến bộ so với lần 1.",
 "remaining":"Điểm còn thiếu hoặc chưa chính xác.",
 "next_step":"Một việc cụ thể nên luyện tiếp.",
 "rubric":{"content":"","evidence":"","reasoning":"","expression":"","structure":"","spelling":""}
}
score là số 0-10. Trước khi cho điểm, tự xác định đề thực sự đòi hỏi những thành phần nào.
Không dùng một rubric cứng cho mọi câu. Tiêu chí không liên quan ghi "Không yêu cầu ở câu này".
TRƯỚC KHI CHẤM, phải tự phân tích động từ của đề và lập thang điểm nội bộ theo đúng các vế yêu cầu. Ví dụ, nếu đề gồm “xác định biện pháp tu từ + phân tích tác dụng”, có thể phân bổ khoảng: xác định 4/10, phân tích tác dụng 5/10, diễn đạt 1/10; được điều chỉnh theo cấu trúc thực tế của đề.
Nếu học sinh đã xác định đúng các biện pháp chính và đã bước đầu nêu tác dụng nhưng còn chung chung, KHÔNG được chấm như bài thiếu phần lớn yêu cầu. Điểm phải phản ánh phần đã làm được; thông thường bài đã đúng phần nhận diện và có phân tích bước đầu phải ở mức đạt trở lên, trừ khi có sai sót nội dung nghiêm trọng.
Khi có nhiều biện pháp, nhận xét phải tách rõ từng biện pháp: biện pháp nào đúng; tác dụng nào đã nêu được; tác dụng nào còn thiếu/chung chung. Không dùng các câu mơ hồ như “lập luận chưa chặt chẽ” nếu không chỉ ra cụ thể chỗ nào và vì sao.
Với hiện tượng lặp một từ, câu trả lời “điệp từ” được xem là cách gọi phù hợp; có thể giải thích thêm “điệp từ/điệp ngữ” nhưng KHÔNG coi “điệp từ” là sai.
Không cho 10/10 nếu phần giải thích/tác dụng còn chung chung trong khi đề yêu cầu phân tích.
Không trừ điểm vì thiếu lập luận/dẫn chứng nếu đề chỉ yêu cầu xác định.
Phần next_step phải biến chỗ thiếu thành 1–2 câu hỏi gợi mở cụ thể để học sinh tự bổ sung, không đưa đáp án.
Chưa cung cấp đáp án tham khảo ở bước này.
`;
    } else if (stage === 'reference') {
      task = `
NHIỆM VỤ: TẠO ĐÁP ÁN THAM KHẢO SAU KHI HỌC SINH ĐÃ KIỂM CHỨNG.
Trả JSON:
{
 "reference":"Một cách trả lời tham khảo đầy đủ, chính xác, vừa đủ theo đúng yêu cầu đề và bám sát ngữ liệu."
}
Nếu đề có nhiều ý, trả lời đủ từng ý. Nếu yêu cầu tác dụng/phân tích, phải gắn tác dụng với từ ngữ/chi tiết và ngữ cảnh cụ thể.
Không bịa dữ kiện ngoài ngữ liệu. Đây chỉ là một cách tham khảo.
`;
    } else if (stage === 'tv_challenge') {
      task = `
NHIỆM VỤ: Tạo 5 câu luyện tập Tiếng Việt mới dựa trên kiến thức đang học và ngữ liệu, từ nhận diện đến vận dụng.
Trả JSON: {"questions":["câu 1","câu 2","câu 3","câu 4","câu 5"]}
Không kèm đáp án.
`;
    } else {
      task = `
NHIỆM VỤ: CỐ VẤN/GỢI MỞ THÊM.
Trả JSON:
{"hint":"Phản hồi cụ thể, bám đề và bài học sinh; chỉ ra điều cần xem lại và gợi ý sâu hơn nhưng không làm bài thay.","question":"Một câu hỏi giúp học sinh tự suy nghĩ tiếp."}
`;
    }

    const prompt = `${tutorRules}\n${context}\n${task}`;
    const data = await callGemini(prompt);
    const text = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || '';
    if (!text) return res.status(500).json({ error: 'AI chưa trả về nhận xét. Em hãy thử lại.' });

    let result;
    try { result = JSON.parse(text); }
    catch {
      result = JSON.parse(text.replace(/\`\`\`json/gi, '').replace(/\`\`\`/g, '').trim());
    }
    res.json(result);
  } catch (error) {
    console.error('Lỗi:', error.message);
    res.status(503).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('');
  console.log('======================================');
  console.log(' HỌC VĂN CÙNG AI - GEMINI ĐÃ KHỞI ĐỘNG');
  console.log(' Có chế độ tự thử lại khi AI quá tải');
  console.log(` Mở trình duyệt: http://localhost:${PORT}`);
  console.log('======================================');
  console.log('');
});
