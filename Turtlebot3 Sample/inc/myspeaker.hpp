#ifndef SPEAKER
#define SPEAKER

#include <iostream>
#include <string>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <cstdint>
#include <unistd.h>
#include <sys/wait.h>
#include <alsa/asoundlib.h>

class Speaker 
{
private:
    const char* pcm_device;
    float speaker_volume;
public:
    Speaker(const char*, float);
    void speakAndSave(const char *text, const char *wavfile);
    void playWav(const char *wav_file, double volume);
    void speak(const char*);
};

#endif SPEAKER