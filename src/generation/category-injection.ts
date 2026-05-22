/** @deprecated 使用 CATEGORY_INJECTIONS_V2 替代，v1 仅含简版文本，作为 fallback */
export const CATEGORY_INJECTIONS: Record<string, string> = {
  "美妆个护": "注重瓶身材质光泽、强调质地细节（膏体/液体/粉质）、柔光氛围、白底 #FFFFFF 或浅粉/浅米 #F5F1E8",
  "服饰鞋包": "展示面料纹理（棉麻/牛仔/皮革/针织）、领型/袖口/下摆细节、自然垂坠感、货架色一致性优先",
  "3C数码": "金属质感、接口清晰可见、戏剧性侧光、暗色背景 #333333、参数图占比可略高",
  "家居清洁": "使用场景展示、前后对比效果、清新蓝白 #F0F7FA 色调、信息图风格偏圆润友好",
  "食品饮料": "暖光、蒸汽/光泽增强食欲感、包装标签文字保证可读、暖木色或食材相关背景",
  "母婴用品": "柔和自然光、温暖色调 #FFF5EE、圆润构图、安全感、材质安全提示",
  "运动户外": "动态构图、强对比光、户外/运动场景、功能性细节展示、耐用材质突出",
  "珠宝配饰": "微距特写、金属反光控制、深色背景突出主体、高级棚拍光",
  "家装家具": "空间感构图、自然光线、材质纹理清晰、真实使用场景、尺寸比例参考物",
  "宠物用品": "活泼明亮色调、宠物互动场景、产品安全细节、温馨家居氛围",
};

export interface CategoryInjection {
  composition: string;
  lighting: string;
  background: string;
  style: string;
}

export const CATEGORY_INJECTIONS_V2: Record<string, CategoryInjection> = {
  "美妆个护": {
    composition: "瓶身居中构图，微距特写强调质地细节（膏体/液体/粉质），产品占据画面70-75%",
    lighting: "柔光箱双侧打光，色温5500K，避免硬阴影",
    background: "纯白背景 #FFFFFF 或浅粉/浅米 #F5F1E8，无渐变",
    style: "高级棚拍风格，强调产品质感与光泽"
  },
  "服饰鞋包": {
    composition: "单品居中或模特上身，展示面料纹理（棉麻/牛仔/皮革/针织），领型/袖口/下摆细节",
    lighting: "自然光模拟，柔光箱+反光板补光",
    background: "纯白 #FFFFFF 或浅灰 #F5F5F5，货架色一致性优先",
    style: "简洁电商风格，自然垂坠感"
  },
  "3C数码": {
    composition: "产品45°角展示，接口清晰可见，配件可环绕排列",
    lighting: "戏剧性侧光+顶光，强调金属质感与边缘轮廓",
    background: "暗色背景 #333333 或纯黑 #000000，突出产品",
    style: "科技感风格，高对比度"
  },
  "家居清洁": {
    composition: "使用场景展示或前后对比效果，产品+环境组合构图",
    lighting: "柔和均匀光，避免强阴影",
    background: "清新蓝白系 #F0F7FA 或家庭场景，信息图风格偏圆润友好",
    style: "温馨家居风格，偏圆润友好"
  },
  "食品饮料": {
    composition: "俯拍或45°角，蒸汽/光泽增强食欲感，包装标签文字保证可读",
    lighting: "暖光 3200K-4000K，侧逆光增强轮廓",
    background: "暖木色或食材相关背景，营造温馨氛围",
    style: "诱人美食风格，暖色调"
  },
  "母婴用品": {
    composition: "圆润构图，产品居中，避免尖锐角度",
    lighting: "柔和自然光，避免强光直射",
    background: "温暖色调 #FFF5EE 或浅粉，安全感氛围",
    style: "温暖安全风格，材质安全提示"
  },
  "运动户外": {
    composition: "动态构图，产品45°或场景中展示，功能性细节突出",
    lighting: "强对比光，户外自然光模拟",
    background: "户外场景或深色背景，耐用材质突出",
    style: "活力运动风格，强力量感"
  },
  "珠宝配饰": {
    composition: "微距特写，产品居中偏上，金属反光控制",
    lighting: "多点光源，控制高光区域不超过画面10%",
    background: "深色背景 #1A1A1A 突出主体，高级棚拍光",
    style: "奢华高级风格"
  },
  "家装家具": {
    composition: "空间感构图，产品在真实使用场景中，可含尺寸比例参考物",
    lighting: "自然光线，窗口光模拟",
    background: "真实家居场景，材质纹理清晰",
    style: "现代简约家居风格"
  },
  "宠物用品": {
    composition: "活泼构图，产品+宠物互动场景",
    lighting: "明亮自然光，避免闪光灯惊吓宠物",
    background: "温馨家居氛围，活泼明亮色调",
    style: "活泼温馨风格"
  }
};

export function getCategoryInjection(category: string): string {
  for (const [key, injection] of Object.entries(CATEGORY_INJECTIONS_V2)) {
    if (category.includes(key) || key.includes(category)) {
      return `构图：${injection.composition}\n光线：${injection.lighting}\n背景：${injection.background}\n风格：${injection.style}`;
    }
  }
  for (const [key, injection] of Object.entries(CATEGORY_INJECTIONS)) {
    if (category.includes(key) || key.includes(category)) return injection;
  }
  return "注重产品清晰展示、自然光照明、干净背景";
}
