import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/auth/password";

const cookieStore = new Map<string, { name: string; value: string }>();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    set(name: string, value: string, _opts?: Record<string, unknown>) {
      cookieStore.set(name, { name, value });
    },
    get(name: string) {
      return cookieStore.get(name);
    },
    delete(name: string) {
      cookieStore.delete(name);
    },
  })),
}));

beforeEach(() => {
  cookieStore.clear();
});

const TEST_EMAIL = "test-auth@mircioo.dev";
const TEST_PHONE = "13800000001";
const TEST_PASSWORD = "test123456";
const TEST_NAME = "测试用户";

async function cleanupTestData() {
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: TEST_EMAIL }, { phone: TEST_PHONE }] },
  });
  if (user) {
    await prisma.member.deleteMany({ where: { userId: user.id } });
    await prisma.workspace.deleteMany({ where: { ownerUserId: user.id } });
    await prisma.user.deleteMany({ where: { id: user.id } });
  }
}

afterAll(async () => {
  await cleanupTestData();
});

function buildRequest(url: string, body?: Record<string, unknown>) {
  return new NextRequest(`http://localhost${url}`, {
    method: body ? "POST" : "GET",
    ...(body
      ? {
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        }
      : {}),
  });
}

describe("password 工具函数", () => {
  it("hashPassword 生成 bcrypt hash", async () => {
    const hash = await hashPassword("mysecret");
    expect(hash).toBeTruthy();
    expect(hash.startsWith("$2")).toBe(true);
  });

  it("verifyPassword 正确密码返回 true", async () => {
    const hash = await hashPassword("mysecret");
    const result = await verifyPassword("mysecret", hash);
    expect(result).toBe(true);
  });

  it("verifyPassword 错误密码返回 false", async () => {
    const hash = await hashPassword("mysecret");
    const result = await verifyPassword("wrongpass", hash);
    expect(result).toBe(false);
  });

  it("同一密码每次 hash 不同", async () => {
    const h1 = await hashPassword("same");
    const h2 = await hashPassword("same");
    expect(h1).not.toBe(h2);
    expect(await verifyPassword("same", h1)).toBe(true);
    expect(await verifyPassword("same", h2)).toBe(true);
  });
});

describe("注册 API POST /api/auth/register", () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  it("邮箱注册成功，返回用户和工作区", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    const req = buildRequest("/api/auth/register", {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      name: TEST_NAME,
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.user.email).toBe(TEST_EMAIL);
    expect(body.user.name).toBe(TEST_NAME);
    expect(body.user.status).toBe("active");
    expect(body.workspace.name).toBe("我的工作区");
    expect(body.workspace.id).toBeTruthy();

    const dbUser = await prisma.user.findFirst({ where: { email: TEST_EMAIL } });
    expect(dbUser).not.toBeNull();
    expect(dbUser!.passwordHash).not.toBe(TEST_PASSWORD);

    const ws = await prisma.workspace.findUnique({ where: { id: body.workspace.id } });
    expect(ws).not.toBeNull();
    expect(ws!.ownerUserId).toBe(dbUser!.id);

    const member = await prisma.member.findFirst({
      where: { userId: dbUser!.id, workspaceId: body.workspace.id },
    });
    expect(member).not.toBeNull();
    expect(member!.role).toBe("owner");
    expect(member!.status).toBe("active");
  });

  it("手机号注册成功", async () => {
    await cleanupTestData();
    const { POST } = await import("@/app/api/auth/register/route");
    const req = buildRequest("/api/auth/register", {
      phone: TEST_PHONE,
      password: TEST_PASSWORD,
      name: TEST_NAME,
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.user.phone).toBe(TEST_PHONE);

    const dbUser = await prisma.user.findFirst({ where: { phone: TEST_PHONE } });
    expect(dbUser).not.toBeNull();
  });

  it("重复邮箱注册返回 409", async () => {
    await cleanupTestData();
    const { POST: POST1 } = await import("@/app/api/auth/register/route");
    const req1 = buildRequest("/api/auth/register", {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      name: TEST_NAME,
    });
    await POST1(req1);

    const { POST } = await import("@/app/api/auth/register/route");
    const req = buildRequest("/api/auth/register", {
      email: TEST_EMAIL,
      password: "other123456",
      name: "重复用户",
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("该手机号或邮箱已注册");
  });

  it("缺少手机号和邮箱返回 400", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    const req = buildRequest("/api/auth/register", {
      password: TEST_PASSWORD,
      name: TEST_NAME,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("手机号或邮箱至少提供一个");
  });

  it("密码少于6位返回 400", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    const req = buildRequest("/api/auth/register", {
      email: "short@test.dev",
      password: "12345",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("注册后会话 cookie 被设置", async () => {
    await cleanupTestData();
    const { POST } = await import("@/app/api/auth/register/route");
    const req = buildRequest("/api/auth/register", {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      name: TEST_NAME,
    });
    const res = await POST(req);
    expect(res.status).toBe(201);

    const sessionCookie = cookieStore.get("mircioo_session");
    expect(sessionCookie).toBeTruthy();
    const data = JSON.parse(sessionCookie!.value);
    expect(data.userId).toBeTruthy();
    expect(data.workspaceId).toBeTruthy();
    expect(data.role).toBe("owner");
  });
});

describe("登录 API POST /api/auth/login", () => {
  beforeAll(async () => {
    await cleanupTestData();
    const { POST } = await import("@/app/api/auth/register/route");
    const req = buildRequest("/api/auth/register", {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      name: TEST_NAME,
    });
    await POST(req);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("邮箱+密码登录成功", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const req = buildRequest("/api/auth/login", {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.user.email).toBe(TEST_EMAIL);
    expect(body.workspaces).toHaveLength(1);
    expect(body.workspaces[0].role).toBe("owner");

    const dbUser = await prisma.user.findFirst({ where: { email: TEST_EMAIL } });
    expect(dbUser!.lastLoginAt).not.toBeNull();
  });

  it("密码错误返回 401", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const req = buildRequest("/api/auth/login", {
      email: TEST_EMAIL,
      password: "wrongpassword",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("密码错误");
  });

  it("不存在的邮箱返回 401", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const req = buildRequest("/api/auth/login", {
      email: "nonexist@test.dev",
      password: TEST_PASSWORD,
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("账号不存在");
  });

  it("缺少身份标识返回 400", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const req = buildRequest("/api/auth/login", {
      password: TEST_PASSWORD,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("登录成功后设置会话 cookie", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const req = buildRequest("/api/auth/login", {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const sessionCookie = cookieStore.get("mircioo_session");
    expect(sessionCookie).toBeTruthy();
    const data = JSON.parse(sessionCookie!.value);
    expect(data.userId).toBeTruthy();
    expect(data.workspaceId).toBeTruthy();
    expect(data.role).toBe("owner");
  });
});

describe("当前用户 API GET /api/auth/me", () => {
  let testUserId: string;
  let testWorkspaceId: string;

  beforeAll(async () => {
    await cleanupTestData();
    const { POST } = await import("@/app/api/auth/register/route");
    const req = buildRequest("/api/auth/register", {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      name: TEST_NAME,
    });
    const res = await POST(req);
    const body = await res.json();
    testUserId = body.user.id;
    testWorkspaceId = body.workspace.id;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("未登录返回 401", async () => {
    const { GET } = await import("@/app/api/auth/me/route");
    const req = buildRequest("/api/auth/me");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("已登录返回用户信息和所有工作区", async () => {
    cookieStore.set("mircioo_session", {
      name: "mircioo_session",
      value: JSON.stringify({
        userId: testUserId,
        workspaceId: testWorkspaceId,
        role: "owner",
      }),
    });

    const { GET } = await import("@/app/api/auth/me/route");
    const req = buildRequest("/api/auth/me");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.user.id).toBe(testUserId);
    expect(body.user.email).toBe(TEST_EMAIL);
    expect(body.user.name).toBe(TEST_NAME);
    expect(body.currentWorkspace).not.toBeNull();
    expect(body.currentWorkspace.id).toBe(testWorkspaceId);
    expect(body.currentWorkspace.role).toBe("owner");
    expect(body.workspaces).toHaveLength(1);
    expect(body.workspaces[0].id).toBe(testWorkspaceId);
  });
});

describe("登出 API POST /api/auth/logout", () => {
  it("清除会话 cookie", async () => {
    cookieStore.set("mircioo_session", {
      name: "mircioo_session",
      value: JSON.stringify({ userId: "u1", workspaceId: "w1", role: "owner" }),
    });

    const { POST } = await import("@/app/api/auth/logout/route");
    const req = buildRequest("/api/auth/logout", {});
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);

    const sessionCookie = cookieStore.get("mircioo_session");
    expect(sessionCookie).toBeUndefined();
  });
});
