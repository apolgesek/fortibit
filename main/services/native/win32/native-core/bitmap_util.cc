#include <vector>
#include <fstream>
#include <string>
#include <array>
#include <dwmapi.h>

std::vector<char> ReadBMP(const std::string &file)
{
  static constexpr size_t HEADER_SIZE = 54;

  std::ifstream bmp(file, std::ios::binary);

  std::array<char, HEADER_SIZE> header;
  bmp.read(header.data(), header.size());

  auto fileSize = *reinterpret_cast<uint32_t *>(&header[2]);
  auto dataOffset = *reinterpret_cast<uint32_t *>(&header[10]);
  auto width = *reinterpret_cast<uint32_t *>(&header[18]);
  auto height = *reinterpret_cast<uint32_t *>(&header[22]);
  auto depth = *reinterpret_cast<uint16_t *>(&header[28]);

  std::vector<char> img(dataOffset - HEADER_SIZE);
  bmp.read(img.data(), img.size());

  int dataSize = ((width * 4) & (~4)) * height;
  img.resize(dataSize);
  bmp.read(img.data(), img.size());

  return img;
}

HBITMAP CreateDIB(int nWidth, int nHeight, int iconWidth, int iconHeight, std::string path, std::string theme)
{
  HBITMAP hbm = NULL;
  HDC hdcMem = CreateCompatibleDC(NULL);
  if (hdcMem != NULL)
  {
    BITMAPINFO bmi;
    ZeroMemory(&bmi.bmiHeader, sizeof(BITMAPINFOHEADER));
    bmi.bmiHeader.biSize = sizeof(BITMAPINFOHEADER);
    bmi.bmiHeader.biWidth = nWidth;
    bmi.bmiHeader.biHeight = nHeight;
    bmi.bmiHeader.biPlanes = 1;
    bmi.bmiHeader.biBitCount = 32;

    PBYTE pbDS = NULL;
    hbm = CreateDIBSection(hdcMem, &bmi, DIB_RGB_COLORS, (VOID**)&pbDS, NULL, NULL);

    if (hbm != NULL) 
    {
      std::vector<char> img = ReadBMP(path);
      std::vector<int> backgroundColor = { 255, 255, 255 };

      if (theme.compare("dark") == 0)
      {
        backgroundColor = { 43, 43, 43 };
      }

      int i = 0;
      int startX = (nWidth / 2) - (iconWidth / 2);
      int startY = (nHeight / 2) - (iconHeight / 2);

      for (int y = 0; y < nHeight; y++)
      {
        for (int x = 0; x < nWidth; x++)
        {
          if (x >= startX && x < (startX + iconWidth) && y >= startY && y < (startY + iconHeight))
          {
            pbDS[0] = (BYTE)(int(img[i] & 0xff));
            pbDS[1] = (BYTE)(int(img[i+1] & 0xff));
            pbDS[2] = (BYTE)(int(img[i+2] & 0xff));
            pbDS[3] = (BYTE)(255);

            i += 4;
          }
          else
          {
            pbDS[0] = (BYTE)(backgroundColor[0]);
            pbDS[1] = (BYTE)(backgroundColor[1]);
            pbDS[2] = (BYTE)(backgroundColor[2]);
            pbDS[3] = (BYTE)(255); // alpha
          }

          pbDS += 4;  
        }
      }
    }
  }

  return hbm;
}