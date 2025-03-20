// 初始化配置参数
const config = {
  scale: 0.8,
  bgColor: 'rgba(255,255,255,0.6)',
  blurSize: 20
};

// 获取DOM元素
const widthInput = document.getElementById('width');
const heightInput = document.getElementById('height');
const scaleInput = document.getElementById('scale');
const scaleValue = document.getElementById('scale-value');
const fileInput = document.getElementById('image-input');
const processBtn = document.getElementById('process-btn');

// 初始化缩放比例显示
scaleInput.addEventListener('input', (e) => {
  config.scale = parseFloat(e.target.value);
  scaleValue.textContent = `${Math.round(config.scale * 100)}%`;
});

// 预设尺寸按钮点击事件
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const width = btn.dataset.width;
    const height = btn.dataset.height;
    widthInput.value = width;
    heightInput.value = height;
    widthInput.dispatchEvent(new Event('input'));
    heightInput.dispatchEvent(new Event('input'));
  });
});

// 创建后台Canvas
const offscreenCanvas = new OffscreenCanvas(1, 1);
const offscreenCtx = offscreenCanvas.getContext('2d');

// 生成毛玻璃背景
function createBackground(width, height) {
  offscreenCanvas.width = width;
  offscreenCanvas.height = height;
  
  offscreenCtx.fillStyle = config.bgColor;
  offscreenCtx.fillRect(0, 0, width, height);
  
  // 应用模糊效果
  offscreenCtx.filter = `blur(${config.blurSize}px)`;
  offscreenCtx.fillRect(0, 0, width, height);
  
  return offscreenCanvas.transferToImageBitmap();
}

// 处理单张图片
async function processImage(file, bgWidth, bgHeight) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    
    img.onload = () => {
      const canvas = new OffscreenCanvas(bgWidth, bgHeight);
      const ctx = canvas.getContext('2d');
      
      // 绘制背景
      const bg = createBackground(bgWidth, bgHeight);
      ctx.drawImage(bg, 0, 0);
      
      // 计算图片缩放尺寸
      const scale = Math.min(
        (bgWidth * config.scale) / img.width,
        (bgHeight * config.scale) / img.height
      );
      
      const imgWidth = img.width * scale;
      const imgHeight = img.height * scale;
      const x = (bgWidth - imgWidth) / 2;
      const y = (bgHeight - imgHeight) / 2;
      
      // 绘制图片
      ctx.drawImage(img, x, y, imgWidth, imgHeight);
      
      canvas.convertToBlob({ type: 'image/png' }).then(blob => {
        resolve({ blob, filename: file.name });
        URL.revokeObjectURL(img.src);
      });
    };
  });
}

// 批量处理并打包
async function handleProcessing() {
  const bgWidth = parseInt(widthInput.value);
  const bgHeight = parseInt(heightInput.value);
  
  if (!bgWidth || !bgHeight) {
    alert('请先设置背景尺寸');
    return;
  }
  
  if (!fileInput.files.length) {
    alert('请选择要处理的图片');
    return;
  }
  
  processBtn.disabled = true;
  processBtn.textContent = '处理中...';
  
  try {
    const zip = new JSZip();
    const promises = [];
    
    Array.from(fileInput.files).forEach(file => {
      promises.push(
        processImage(file, bgWidth, bgHeight)
          .then(({ blob, filename }) => {
            zip.file(`processed_${filename}`, blob);
          })
      );
    });
    
    await Promise.all(promises);
    
    const content = await zip.generateAsync({ type: 'blob' });
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(content);
    downloadLink.download = 'processed_images.zip';
    downloadLink.click();
    
  } catch (error) {
    console.error('处理失败:', error);
    alert('图片处理失败，请检查控制台');
  } finally {
    processBtn.disabled = false;
    processBtn.textContent = '开始处理';
  }
}

// 绑定处理事件
processBtn.addEventListener('click', handleProcessing);