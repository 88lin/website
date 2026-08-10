"""apple-touch-icon：180x180 PNG，几何与 public/favicon.svg 严格一致。
两条主线用陶土红与墨色（不是红配绿）——红绿在色觉障碍下几乎同色，靠明度拉开才稳。"""
from PIL import Image, ImageDraw
S = 180
img = Image.new('RGBA', (S*4, S*4), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
k = S * 4 / 64
d.rounded_rectangle([0, 0, S*4-1, S*4-1], radius=int(14*k), fill='#FDF8F1')
d.polygon([(17*k, 16*k), (26.5*k, 16*k), (47*k, 48*k), (37.5*k, 48*k)], fill='#2A1D18')
d.polygon([(47*k, 16*k), (37.5*k, 16*k), (17*k, 48*k), (26.5*k, 48*k)], fill='#A8452F')
def diamond(r, fill):
    c = 32 * k
    d.polygon([(c, c-r*k), (c+r*k, c), (c, c+r*k), (c-r*k, c)], fill=fill)
diamond(12.5, '#EFCE9A')
diamond(6.8, '#2F6B5B')
img.resize((S, S), Image.LANCZOS).save('public/apple-touch-icon.png')
print('ok', Image.open('public/apple-touch-icon.png').size)
