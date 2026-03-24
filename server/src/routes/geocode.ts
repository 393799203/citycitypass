import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { address } = req.query;
    if (!address) {
      return res.status(400).json({ success: false, message: '请提供地址' });
    }

    const amapKey = process.env.AMAP_KEY;
    const response = await fetch(
      `https://restapi.amap.com/v3/geocode/geo?key=${amapKey}&address=${encodeURIComponent(String(address))}`
    );
    const data = await response.json() as { status: string; geocodes?: { location: string; province: string; city: string; district: string }[] };

    if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
      const geocode = data.geocodes[0];
      const [longitude, latitude] = geocode.location.split(',');
      res.json({
        success: true,
        data: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          location: `${geocode.province}${geocode.city}${geocode.district}`,
        },
      });
    } else {
      res.status(404).json({ success: false, message: '地址解析失败' });
    }
  } catch (error) {
    console.error('Geocode error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
