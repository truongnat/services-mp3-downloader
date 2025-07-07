
const FORMAT = {
    MP3: 'mp3',
    M4A: 'm4a',
    OPUS: 'opus'
};

const QUALITY = {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low'
}

export const AUDIO_FORMATS = [
    {
        value: FORMAT.MP3,
        label: 'MP3 (Most compatible)'
    },
    {
        value: FORMAT.M4A,
        label: 'M4A (Better quality)'
    },
    {
        value: FORMAT.OPUS,
        label: 'OPUS (Smallest size)'
    }
];

export const AUDIO_QUALITIES = [
    {
        value: QUALITY.HIGH,
        label: 'High (320kbps)'
    },
    {
        value: QUALITY.MEDIUM,
        label: 'Medium (192kbps)'
    },
    {
        value: QUALITY.LOW,
        label: 'Low (128kbps)'
    }
];


export const FILENAME_FORMAT_OPTIONS = [
    {
        value: '{index}. {artist} - {title}',
        label: 'Track Number + Artist - Title',
        example: '01. Artist Name - Song Title'
    },
    {
        value: '{artist} - {title}',
        label: 'Artist - Title',
        example: 'Artist Name - Song Title'
    },
    {
        value: '{title} - {artist}',
        label: 'Title - Artist',
        example: 'Song Title - Artist Name'
    },
    {
        value: '{title}',
        label: 'Title Only',
        example: 'Song Title'
    },
    {
        value: '{index}. {title}',
        label: 'Track Number + Title',
        example: '01. Song Title'
    },
    {
        value: '[{index}] {artist} - {title}',
        label: '[Track] Artist - Title',
        example: '[01] Artist Name - Song Title'
    },
    {
        value: '{artist} - {title} ({index})',
        label: 'Artist - Title (Track)',
        example: 'Artist Name - Song Title (01)'
    },
    {
        value: '{index:03d} - {artist} - {title}',
        label: 'Padded Track - Artist - Title',
        example: '001 - Artist Name - Song Title'
    }
];

export const DEFAULT_SETTINGS: AudioSettings = {
    quality: 'high',
    format: 'mp3',
    filenameFormat: '{index}. {artist} - {title}',
    includeArtist: true,
    includeIndex: true,
    sanitizeFilename: true,
};

export interface AudioSettings {
    quality: Lowercase<keyof typeof QUALITY>;
    format: Lowercase<keyof typeof FORMAT>;
    filenameFormat: string;
    includeArtist: boolean;
    includeIndex: boolean;
    sanitizeFilename: boolean;
}