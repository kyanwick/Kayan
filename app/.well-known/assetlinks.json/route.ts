import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.kayan.app",
        sha256_cert_fingerprints: [
          "4D:D1:67:20:79:57:DF:D9:9F:21:97:C3:5F:9B:09:4D:43:66:24:E2:D7:E9:78:D1:C8:E6:D6:B3:67:20:CE:FE",
        ],
      },
    },
  ]);
}
