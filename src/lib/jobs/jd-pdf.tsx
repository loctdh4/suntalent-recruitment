import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import Html from "react-pdf-html";
import { sanitizeHtml } from "@/lib/sanitize";

// Font hỗ trợ tiếng Việt (Be Vietnam Pro) — đăng ký từ CDN.
Font.register({
  family: "BeVietnamPro",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/bevietnampro/BeVietnamPro-Regular.ttf",
      fontWeight: "normal",
    },
    {
      src: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/bevietnampro/BeVietnamPro-SemiBold.ttf",
      fontWeight: "bold",
    },
  ],
});

const STATUS_LABEL: Record<string, string> = {
  open: "Đang mở",
  on_hold: "Tạm dừng",
  closed: "Đã đóng",
  filled: "Đã tuyển",
};

function vnd(n: number | null) {
  return n == null ? "—" : n.toLocaleString("vi-VN") + " VND";
}

/** Khoảng lương; không có thì "Thỏa thuận". */
function salaryText(min: number | null, max: number | null) {
  if (min == null && max == null) return "Thỏa thuận";
  if (min != null && max != null) return `${vnd(min)} - ${vnd(max)}`;
  if (min != null) return `Từ ${vnd(min)}`;
  return `Đến ${vnd(max)}`;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "BeVietnamPro", fontSize: 11, color: "#1f2937", lineHeight: 1.5 },
  header: { borderBottom: "2 solid #2563eb", paddingBottom: 10, marginBottom: 16 },
  brand: { fontSize: 10, color: "#2563eb", fontWeight: "bold", marginBottom: 4 },
  title: { fontSize: 20, fontWeight: "bold", color: "#111827" },
  subtitle: { fontSize: 11, color: "#6b7280", marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 16 },
  cell: { width: "50%", marginBottom: 8 },
  label: { fontSize: 9, color: "#6b7280", marginBottom: 2 },
  value: { fontSize: 12, fontWeight: "bold" },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 13, fontWeight: "bold", color: "#111827", marginBottom: 6 },
  skills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  skill: { fontSize: 10, backgroundColor: "#eff6ff", color: "#1d4ed8", paddingVertical: 3, paddingHorizontal: 8, borderRadius: 4 },
  desc: { fontSize: 11, color: "#374151" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 9, color: "#9ca3af", textAlign: "center", borderTop: "1 solid #e5e7eb", paddingTop: 8 },
});

export type JobPdfData = {
  title: string;
  clientName: string | null;
  location: string | null;
  status: string;
  headcount: number;
  contractValue: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  requiredSkills: string[] | null;
  description: string | null;
};

export async function renderJobPdf(job: JobPdfData): Promise<Buffer> {
  return renderToBuffer(
    <Document title={`JD - ${job.title}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>SUNTALENT</Text>
          <Text style={styles.title}>{job.title}</Text>
          <Text style={styles.subtitle}>
            {(job.clientName ?? "—") + (job.location ? `  •  ${job.location}` : "")}
          </Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.cell}>
            <Text style={styles.label}>Khách hàng</Text>
            <Text style={styles.value}>{job.clientName ?? "—"}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.label}>Trạng thái</Text>
            <Text style={styles.value}>{STATUS_LABEL[job.status] ?? job.status}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.label}>Số lượng cần tuyển</Text>
            <Text style={styles.value}>{job.headcount}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.label}>Mức lương</Text>
            <Text style={styles.value}>
              {salaryText(job.salaryMin, job.salaryMax)}
            </Text>
          </View>
        </View>

        {job.requiredSkills && job.requiredSkills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kỹ năng yêu cầu</Text>
            <View style={styles.skills}>
              {job.requiredSkills.map((s, i) => (
                <Text key={i} style={styles.skill}>
                  {s}
                </Text>
              ))}
            </View>
          </View>
        )}

        {job.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mô tả công việc</Text>
            <Html style={styles.desc} resetStyles>
              {`<div>${sanitizeHtml(job.description)}</div>`}
            </Html>
          </View>
        )}

        <Text style={styles.footer} fixed>
          Tài liệu tạo bởi SunTalent
        </Text>
      </Page>
    </Document>,
  );
}
