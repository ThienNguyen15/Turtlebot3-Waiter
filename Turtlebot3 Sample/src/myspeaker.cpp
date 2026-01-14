#include "myspeaker.hpp"

Speaker::Speaker(const char *device_name, float volume)
{
    pcm_device = device_name;
    speaker_volume = volume;
}

// Function to speak text using espeak and save it to a temporary .wav file
void Speaker::speakAndSave(const char *text, const char *wavfile)
{
    #ifdef BUILD_FOR_X64

    #else
    // Construct the espeak command to generate the audio
    char cmd[1024];
    sprintf(cmd, "echo \"%s\" | /root/piper/build/piper --model /root/en_US-hfc_female-medium.onnx --output_file - | ffmpeg -f wav -i pipe: -ar 44100 -ac 2 -af \"volume=%f\" -ab 192k %s", text, speaker_volume, wavfile);

    // Execute the command
    int ret = system(cmd);
    if (ret != 0)
    {
        std::cerr << "Error executing espeak command." << std::endl;
        exit(1);
    }
    #endif
}

void Speaker::playWav(const char *wav_file, double volume)
{
    #ifdef BUILD_FOR_X64

    #else
    // Open the PCM device
    snd_pcm_t *pcm_handle;
    if (snd_pcm_open(&pcm_handle, pcm_device, SND_PCM_STREAM_PLAYBACK, 0) < 0)
    {
        std::cerr << "Error opening PCM device" << std::endl;
        return;
    }

    // Set parameters for PCM playback
    snd_pcm_hw_params_t *params;
    snd_pcm_hw_params_alloca(&params);
    snd_pcm_hw_params_any(pcm_handle, params);
    snd_pcm_hw_params_set_access(pcm_handle, params, SND_PCM_ACCESS_RW_INTERLEAVED);
    snd_pcm_hw_params_set_format(pcm_handle, params, SND_PCM_FORMAT_S16_LE); // 16-bit little-endian format
    snd_pcm_hw_params_set_channels(pcm_handle, params, 2);                   // Stereo
    unsigned int sample_rate = 44100;
    snd_pcm_hw_params_set_rate_near(pcm_handle, params, &sample_rate, 0);

    // Apply parameters to PCM device
    if (snd_pcm_hw_params(pcm_handle, params) < 0)
    {
        std::cerr << "Error setting HW parameters" << std::endl;
        return;
    }

    // Open the wav file
    FILE *file = fopen(wav_file, "r");
    if (!file)
    {
        std::cerr << "Error opening WAV file" << std::endl;
        return;
    }

    // Read data from wav file and write it to the PCM device
    const int BUFFER_SIZE = 4096;
    char buffer[BUFFER_SIZE];
    while (fread(buffer, sizeof(char), BUFFER_SIZE, file) > 0)
    {
        // Apply volume scaling to the audio samples
        for (int i = 0; i < BUFFER_SIZE; i += 2)
        {
            short *sample = reinterpret_cast<short *>(&buffer[i]);
            *sample = static_cast<short>(*sample * volume);
        }

        // Write the scaled data to the PCM device
        if (snd_pcm_writei(pcm_handle, buffer, BUFFER_SIZE / 4) < 0)
        { // Assume 16-bit samples, hence dividing by 4
            std::cerr << "Error writing to PCM device" << std::endl;
            return;
        }
    }

    // Close PCM handle and wav file
    fclose(file);
    snd_pcm_drain(pcm_handle);
    snd_pcm_close(pcm_handle);
    #endif
}

void Speaker::speak(const char *text)
{
    #ifdef BUILD_FOR_X64
    std::cout << "Speaking: " << text << std::endl;
    #else
        const char *wavfile = "/root/test.wav"; // Temporary .wav file
        std::remove(wavfile);

        speakAndSave(text, wavfile);
        playWav(wavfile, 1);

        // Clean up temporary file
        std::remove(wavfile);
    #endif
}