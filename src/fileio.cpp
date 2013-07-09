#include <src/fileio.h>

bool readFile(const char *filename, std::string &dest)
{
	std::ifstream in(filename, std::ios::in | std::ios::binary);
	if(!in.is_open())
		return false;

	if(in.good())
	{
		in.seekg(0, std::ios::end);			// Set get position to end
		dest.resize(in.tellg());			// Resize string to support enough bytes
		in.seekg(0, std::ios::beg);			// Set get position to beginning
		in.read(&dest[0], dest.size());		// Read file to string
		in.close();
	}

	return true;
}