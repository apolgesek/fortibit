#include <vector>
#include <string>
#include <dwmapi.h>

std::vector<char> ReadBMP(const std::string &file);
HBITMAP CreateDIB(int nWidth, int nHeight, int iconWidth, int iconHeight, std::string path);