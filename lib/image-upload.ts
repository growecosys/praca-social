export const MAX_UPLOAD_BYTES = 900 * 1024;
export async function prepareImage(file: File): Promise<File> {
  if (!['image/jpeg','image/png','image/webp','image/avif','image/gif'].includes(file.type)) throw new Error('Envie uma imagem JPG, PNG, GIF, WebP ou AVIF.');
  if (file.size > 24 * 1024 * 1024) throw new Error('Escolha uma imagem de até 24 MB.');
  if (file.size <= MAX_UPLOAD_BYTES) return file;
  if (file.type === 'image/gif') throw new Error('Para preservar a animação, envie um GIF de até 900 KB ou converta-o em uma imagem estática.');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image(); img.src = url; await img.decode();
    let width=img.naturalWidth, height=img.naturalHeight;
    if (!width || !height || width*height>80_000_000) throw new Error('A imagem tem dimensões muito grandes. Exporte uma cópia menor.');
    const scale=Math.min(1,2048/Math.max(width,height)); width=Math.round(width*scale);height=Math.round(height*scale);
    const canvas=document.createElement('canvas');
    for(let attempt=0;attempt<5;attempt++) {
      canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Não foi possível preparar a foto neste navegador.');
      ctx.drawImage(img,0,0,width,height);
      const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',Math.max(.55,.86-attempt*.07)));
      if(blob&&blob.size<=MAX_UPLOAD_BYTES)return new File([blob],'foto.webp',{type:blob.type});
      width=Math.max(1,Math.round(width*.8));height=Math.max(1,Math.round(height*.8));
    }
    throw new Error('Não foi possível reduzir a imagem. Exporte uma cópia menor e tente novamente.');
  } finally { URL.revokeObjectURL(url); }
}
export async function readImageResponse(response: Response) {
  if(response.status===413)throw new Error('A imagem excedeu o limite de envio. Escolha uma versão menor.');
  const raw=await response.text();let data:any;
  try {data=JSON.parse(raw);}catch {throw new Error('O servidor não conseguiu receber a imagem. Tente novamente em instantes.');}
  if(!response.ok)throw new Error(data.error||'Não foi possível concluir a operação.');return data;
}
