import { describe, expect, it } from "vitest";
import { createTencentCloudHeaders } from "../src/lib/email/tencent-ses";

describe("Tencent SES signing", () => {
  it("creates TC3 signed headers for SendEmail", () => {
    const headers = createTencentCloudHeaders({
      action: "SendEmail",
      endpoint: "ses.tencentcloudapi.com",
      payload: JSON.stringify({ Subject: "Reset", Destination: ["user@example.com"] }),
      region: "ap-guangzhou",
      secretId: "AKIDEXAMPLE",
      secretKey: "SECRETEXAMPLE",
      service: "ses",
      timestamp: 1_711_526_400,
      version: "2020-10-02",
    });

    expect(headers.Authorization).toContain("TC3-HMAC-SHA256");
    expect(headers.Authorization).toContain("Credential=AKIDEXAMPLE/2024-03-27/ses/tc3_request");
    expect(headers.Authorization).toContain("SignedHeaders=content-type;host;x-tc-action");
    expect(headers.Authorization).toMatch(/Signature=[a-f0-9]{64}$/);
    expect(headers.Authorization).not.toContain("SECRETEXAMPLE");
    expect(headers["Content-Type"]).toBe("application/json; charset=utf-8");
    expect(headers.Host).toBe("ses.tencentcloudapi.com");
    expect(headers["X-TC-Action"]).toBe("SendEmail");
    expect(headers["X-TC-Region"]).toBe("ap-guangzhou");
    expect(headers["X-TC-Version"]).toBe("2020-10-02");
  });
});
