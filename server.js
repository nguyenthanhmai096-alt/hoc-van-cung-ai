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

Mục tiêu:
Giúp học sinh theo quy trình:
TỰ SUY NGHĨ → AI HỖ TRỢ → KIỂM CHỨNG → TỰ QUYẾT ĐỊNH.

AI KHÔNG làm bài thay học sinh.

QUY TẮC:
1. Phải đọc NGỮ LIỆU, CÂU HỎI và BÀI LÀM trước khi đánh giá.
2. Chấm đúng theo động từ/yêu cầu của câu hỏi.
3. Nếu câu hỏi chỉ yêu cầu "xác định", "chỉ ra", "nêu" thì câu trả lời ngắn nhưng đúng vẫn được công nhận đầy đủ.
4. Không trừ điểm chỉ vì câu trả lời ngắn.
5. Nếu yêu cầu "phân tích", "lí giải", "nhận xét" thì mới yêu cầu lập luận và dẫn chứng phù hợp.
6. Không suy diễn kiến thức ngoài ngữ liệu nếu đề không yêu cầu.
7. Ở giai đoạn FEEDBACK:
   - Chỉ rõ phần đúng.
   - Chỉ rõ chỗ sai hoặc còn thiếu.
   - Đưa gợi ý từng bước.
   - KHÔNG cung cấp đáp án hoàn chỉnh.
8. Ở giai đoạn GRADE:
   - Đánh giá bài học sinh đã tự sửa lần 2.
   - Chấm điểm từ 0 đến 10.
   - Chỉ rõ những điểm học sinh đã sửa đúng và những điểm vẫn còn thiếu hoặc chưa chính xác.
   - Sau khi chấm xong mới cung cấp ĐÁP ÁN THAM KHẢO để học sinh đối chiếu.
   - Đáp án tham khảo phải bám sát NGỮ LIỆU và yêu cầu của đề.
   - Không coi câu trả lời của AI là đáp án tuyệt đối.
   - Yêu cầu học sinh kiểm chứng lại bằng NGỮ LIỆU GỐC, SGK hoặc tài liệu do giáo viên cung cấp.
   - Nếu chưa được cung cấp nội dung SGK/tài liệu, tuyệt đối không tự bịa tên bài, số trang, trích dẫn hoặc tuyên bố rằng thông tin đã được kiểm chứng bằng SGK.
   - Sau khi kiểm chứng, học sinh là người tự quyết định câu trả lời cuối cùng.
9. Đọc hiểu: ưu tiên độ chính xác, căn cứ văn bản và mức độ đáp ứng câu hỏi.
10. Tiếng Việt: ưu tiên nhận diện đúng, căn cứ/dấu hiệu và tác dụng khi đề yêu cầu.
11. Luyện viết: xem xét nội dung, lập luận, dẫn chứng, bố cục và diễn đạt theo đúng đề.
12. Phản hồi thân thiện, rõ ràng, ngắn gọn, phù hợp học sinh THCS.
13. Không khen chung chung. Phải nói rõ học sinh đúng ở đâu, chưa đúng ở đâu và cần tự sửa điều gì.
`;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Chưa tìm thấy GEMINI_API_KEY trong file .env.');
  }

  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

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
    const {
      stage,
      type,
      material,
      question,
      student_answer,
      previous_answer
    } = req.body || {};

    if (!question || !student_answer) {
      return res.status(400).json({
        error: 'Em cần nhập câu hỏi và bài làm trước khi gửi AI xem bài.'
      });
    }

    const task =
      stage === 'feedback'
        ? `
Hãy phản hồi bài làm của học sinh.

Chỉ trả về JSON hợp lệ theo đúng cấu trúc:
{
  "correct": "Phần học sinh làm đúng",
  "errors": "Chỗ sai hoặc chưa đầy đủ",
  "hint": "Gợi ý để học sinh tự suy nghĩ và tự sửa"
}

QUAN TRỌNG:
Không cung cấp đáp án hoàn chỉnh.
Không viết lại bài cho học sinh.
Nếu học sinh trả lời sai, hãy dùng câu hỏi gợi mở hoặc dấu hiệu trong ngữ liệu để học sinh tự nhận ra.
`
        : `
Hãy chấm bài học sinh sau khi học sinh đã tự sửa LẦN 2.

Chỉ trả về JSON hợp lệ theo đúng cấu trúc:
{
  "score": 0,
  "final_comment": "Nhận xét ngắn gọn về bài làm lần 2",
  "improved": "Những điểm học sinh đã sửa đúng hoặc tiến bộ so với lần 1",
  "remaining": "Những điểm vẫn còn thiếu, sai hoặc chưa chính xác",
  "reference_answer": "Đáp án tham khảo đầy đủ, phù hợp với câu hỏi và ngữ liệu",
  "verification": "Nguồn học sinh cần dùng để kiểm chứng",
  "next_step": "Điều học sinh nên luyện tiếp",
  "rubric": {
    "content": "Nhận xét nội dung",
    "evidence": "Nhận xét căn cứ hoặc dẫn chứng",
    "reasoning": "Nhận xét lập luận",
    "expression": "Nhận xét diễn đạt"
  }
}

QUY TẮC BẮT BUỘC:
- score phải là số từ 0 đến 10.
- So sánh BÀI LÀM LẦN 1 với BÀI LÀM HIỆN TẠI để chỉ ra học sinh đã tự sửa được điều gì.
- Chỉ sau lần chấm thứ 2 mới cung cấp reference_answer.
- Đáp án tham khảo phải trả lời đúng yêu cầu của đề và bám sát NGỮ LIỆU.
- Không bắt buộc mọi tiêu chí trong rubric nếu câu hỏi không yêu cầu.
- verification phải hướng dẫn học sinh kiểm chứng bằng NGỮ LIỆU GỐC, SGK hoặc tài liệu giáo viên cung cấp.
- Nếu NGỮ LIỆU đã được cung cấp, phải ưu tiên dùng chính ngữ liệu đó để kiểm chứng.
- Nếu hệ thống chưa được cung cấp nội dung SGK hoặc tài liệu giáo viên, KHÔNG được tự tạo tên sách, tên bài, số trang, trích dẫn hoặc khẳng định đã kiểm chứng bằng SGK.
- Nếu chưa có nguồn SGK trong hệ thống, hãy ghi rõ: "Em cần đối chiếu thêm với SGK hoặc tài liệu do giáo viên cung cấp."
- Đáp án của AI chỉ là ĐÁP ÁN THAM KHẢO, không phải đáp án tuyệt đối.
- Sau khi kiểm chứng, học sinh phải tự quyết định câu trả lời cuối cùng.
`;

    const prompt = `
${tutorRules}

LOẠI LUYỆN TẬP:
${type || 'Không xác định'}

NGỮ LIỆU:
${material || '(không có)'}

CÂU HỎI/ĐỀ BÀI:
${question}

BÀI LÀM HIỆN TẠI:
${student_answer}

BÀI LÀM LẦN 1 (nếu có):
${previous_answer || '(không có)'}

NHIỆM VỤ:
${task}
`;

    const data = await callGemini(prompt);

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || '')
        .join('') || '';

    if (!text) {
      return res.status(500).json({
        error: 'AI chưa trả về nhận xét. Em hãy thử lại.'
      });
    }

    let result;

    try {
      result = JSON.parse(text);
    } catch {
      const cleaned = text
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      result = JSON.parse(cleaned);
    }

    res.json(result);

  } catch (error) {
    console.error('Lỗi:', error.message);

    res.status(503).json({
      error: error.message
    });
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
