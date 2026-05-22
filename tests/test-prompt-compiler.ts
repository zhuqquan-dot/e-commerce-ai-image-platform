import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { PromptCompiler } from "../src/generation/prompt-compiler";
import path from "node:path";

async function main() {
  const dbUrl = process.env["DATABASE_URL"] ?? "file:./dev.db";
  const dbPath = dbUrl.startsWith("file:")
    ? dbUrl.replace("file:", "").replace(/^\.\//, "")
    : dbUrl;
  const absoluteDbPath = path.resolve(dbPath);

  const adapter = new PrismaBetterSqlite3({ url: absoluteDbPath });
  const prisma = new PrismaClient({ adapter });

  try {
    const compiler = new PromptCompiler();

    const product = await prisma.product.findFirst({ where: { mainColor: { not: '' }, shapeType: { not: '' } } });
    const amazonRule = await prisma.platformRulePack.findUnique({ where: { platformName: 'AMAZON' } });
    const taobaoRule = await prisma.platformRulePack.findUnique({ where: { platformName: 'TAOBAO_TMALL' } });
    const series = await prisma.seriesPack.findFirst();
    const brand = await prisma.brandPack.findFirst();

    if (!product || !amazonRule || !taobaoRule) {
      console.log('需要先运行 seed: npx tsx prisma/seed.ts');
      return;
    }

    // Test 1: Amazon 主图编译
    console.log('=== Test 1: Amazon main_white ===');
    const amazonResult = await compiler.compile({
      productId: product.id,
      platformPackId: 'AMAZON',
      slotType: 'main_white',
      seriesPackId: series?.id,
      brandPackId: brand?.id,
    });
    console.log('Prompt:', amazonResult.promptText.substring(0, 500));
    console.log('Validation warnings:', amazonResult.validationWarnings);
    console.log('Section3 contains "纯白背景":', amazonResult.promptSections.section3_platformConstraint.includes('纯白背景'));
    console.log('Section3 contains "禁止":', amazonResult.promptSections.section3_platformConstraint.includes('禁止'));

    // Test 2: 淘宝主图编译
    console.log('\n=== Test 2: TAOBAO_TMALL main_text ===');
    const taobaoResult = await compiler.compile({
      productId: product.id,
      platformPackId: 'TAOBAO_TMALL',
      slotType: 'main_text',
      seriesPackId: series?.id,
      brandPackId: brand?.id,
    });
    console.log('Prompt:', taobaoResult.promptText.substring(0, 500));
    console.log('Section3 contains "避让":', taobaoResult.promptSections.section3_platformConstraint.includes('避让'));
    console.log('Section3 contains "允许文字":', taobaoResult.promptSections.section3_platformConstraint.includes('允许文字'));

    // Test 3: 准入检查 - 缺少 mainColor
    console.log('\n=== Test 3: Missing mainColor ===');
    const productNoColor = await prisma.product.findFirst({ where: { mainColor: '' } });
    if (productNoColor) {
      const validation = await compiler.validateInput({
        productId: productNoColor.id,
        platformPackId: 'AMAZON',
        slotType: 'main_white',
      });
      console.log('Valid:', validation.valid);
      console.log('Errors:', validation.errors);
    } else {
      console.log('所有商品都有 mainColor，跳过此测试');
    }

    console.log('\n=== All tests done ===');
  } catch (e: any) {
    console.error('Test error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
