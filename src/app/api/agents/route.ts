import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { MeridianGuard } from "@/lib/security/meridian-guard";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const role = searchParams.get("role");
    const search = searchParams.get("search");

    const where: any = {};
    if (category) where.category = category;
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { tagline: { contains: search } },
      ];
    }

    const agents = await prisma.agentProfile.findMany({
      where,
      include: {
        capabilities: true,
        securityPolicy: true,
      },
      orderBy: {
        reputationScore: "desc",
      },
    });

    return NextResponse.json({ status: "SUCCESS", data: agents });
  } catch (err: any) {
    return NextResponse.json(
      { status: "ERROR", error: err?.message || "Failed to fetch agents" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      tagline,
      description,
      nearAccountId,
      role = "PROVIDER",
      category,
      pricingModel = "FIXED",
      basePriceNear = "3.0",
      capabilities = [],
      maxTaskBudgetNear = 50.0,
      dailySpendLimitNear = 150.0,
    } = body;

    if (!name || !nearAccountId || !category) {
      return NextResponse.json(
        { status: "ERROR", error: "Missing required fields: name, nearAccountId, category" },
        { status: 400 }
      );
    }

    // Slug generation
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Math.floor(Math.random() * 1000);

    // Get or create owner user
    let user = await prisma.user.findFirst({
      where: { nearAccountId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          nearAccountId,
          role: "USER",
        },
      });
    }

    // Create Agent with Capabilities and Meridian Guard Policy
    const agent = await prisma.agentProfile.create({
      data: {
        name,
        slug,
        tagline: tagline || `${category} Specialist Agent`,
        description: description || "Autonomous agent operating on NEAR Protocol",
        ownerId: user.id,
        nearAccountId,
        role,
        category,
        pricingModel,
        basePriceNear: String(basePriceNear),
        isDemo: false,
        reputationScore: 50.0,
        capabilities: {
          create: capabilities.map((c: any) => ({
            name: c.name || "Default Capability",
            description: c.description || "",
            skillTag: c.skillTag || "general",
            verified: false,
          })),
        },
        securityPolicy: {
          create: {
            maxTaskBudgetNear: Number(maxTaskBudgetNear),
            dailySpendLimitNear: Number(dailySpendLimitNear),
            allowedMethodsJson: JSON.stringify(["register_agent", "submit_bid", "submit_deliverable"]),
            requiresHumanConfirm: true,
            isPaused: false,
          },
        },
      },
      include: {
        capabilities: true,
        securityPolicy: true,
      },
    });

    await MeridianGuard.logAudit({
      actionType: "AGENT_REGISTERED",
      severity: "INFO",
      details: { agentId: agent.id, name: agent.name, accountId: nearAccountId },
      userId: user.id,
    });

    return NextResponse.json({ status: "SUCCESS", data: agent }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { status: "ERROR", error: err?.message || "Failed to register agent" },
      { status: 500 }
    );
  }
}
