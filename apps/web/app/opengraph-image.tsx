import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "SchoolVajo - Online School Management Software & ERP Portal";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          backgroundColor: "#0F172A",
          backgroundImage:
            "radial-gradient(circle at 25% 25%, #4F46E5 0%, transparent 40%), radial-gradient(circle at 75% 75%, #7C3AED 0%, transparent 40%)",
          padding: "60px 80px",
          color: "#FFFFFF",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "20px",
              backgroundColor: "#4F46E5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid rgba(255, 255, 255, 0.2)",
              fontSize: "32px",
              fontWeight: 900,
            }}
          >
            S
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: "32px",
                fontWeight: 900,
                letterSpacing: "-1px",
              }}
            >
              SchoolVajo
            </span>
            <span
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "#A5B4FC",
                textTransform: "uppercase",
                letterSpacing: "2px",
              }}
            >
              Cloud Campus Platform
            </span>
          </div>
        </div>

        {/* Middle Main Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "rgba(99, 102, 241, 0.25)",
              border: "1px solid rgba(165, 180, 252, 0.4)",
              borderRadius: "50px",
              padding: "6px 20px",
              color: "#C7D2FE",
              fontSize: "14px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              alignSelf: "flex-start",
            }}
          >
            #1 Online School Management Software
          </div>
          <h1
            style={{
              fontSize: "56px",
              fontWeight: 900,
              lineHeight: 1.15,
              maxWidth: "960px",
              margin: 0,
              letterSpacing: "-1.5px",
            }}
          >
            Run Your School Smarter, Faster &amp; Beautifully
          </h1>
          <p
            style={{
              fontSize: "22px",
              color: "#94A3B8",
              maxWidth: "880px",
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            Attendance • Examinations • Digital Report Cards • Homework • Multi-Role Portals &amp; Mobile Apps
          </p>
        </div>

        {/* Bottom Feature Badges */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            borderTop: "1px solid rgba(255, 255, 255, 0.15)",
            paddingTop: "24px",
          }}
        >
          <div style={{ display: "flex", gap: "24px", fontSize: "16px", color: "#CBD5E1", fontWeight: 700 }}>
            <span>✓ 5 Unified Roles</span>
            <span>✓ Real-Time Sync</span>
            <span>✓ Native Android &amp; iOS</span>
            <span>✓ 100% Cloud Security</span>
          </div>
          <div
            style={{
              fontSize: "18px",
              fontWeight: 800,
              color: "#818CF8",
            }}
          >
            schoolvajo.com
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
