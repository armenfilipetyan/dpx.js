/*
 * DPX Image Reader 
 * Armen Filipetyan
 * MIT Licensed
 *  
 */

var fs = require('fs');

// Enums 
var TRANSFER_TYPES = Object.freeze({
    'UNDEFINED' : 0,
    'RED' : 1,
    'GREEN' : 2,
    'BLUE' : 3,
    'ALPHA' : 4,
    'LUMINANCE' : 6,
    'CHROMA' : 7, // Color Difference CbCr
    'DEPTH' : 8,
    'COMPOSITE' : 9, // Composite Video
    'RGB' : 50,
    'RGBA' : 51,
    'ABGR' : 52,
    'BGR' : 53,
    'YUV422' : 100, // CbYCrY422
    'YUV4224' : 101, // CbYCrYA4224
    'YUV444' : 102, // CbYCr444
    'YUV4444' : 103, // CbYCrA4444
    'USER' : 150
}); 

var COLORIMETRIC = Object.freeze({
    'USER' : 0,
    'PRINT' : 1,
    'LINEAR' : 2,
    'LOG' : 3,
    'UNDEFINED' : 4,
    'SMTPE_274M' : 5,
    'ITU_R709' : 6, // Rec709
    'ITU_R601_625L' : 7,
    'ITU_R601_525L' : 8,
    'NTSC' : 9,
    'PAL' : 10,
    'ZDEPTH' : 11, // ZDepth Linear
    'DEPTH' : 12 // Depth Homogeneous
});


// Read Functions
function ReadImageData( buffer, offset, len ){
    var s = ''; 
    for ( i = offset; i < (len+offset); ++i ) {
        s = s.concat( buffer.readUInt8(i) );
    }
    return s;
}

function ReadBytes( buffer, offset, len ){
    var s = ''; 
    for ( i = offset; i < (len+offset); ++i ) {
        s = s.concat( String.fromCharCode( buffer.readUInt8(i).toString() ) );
    }
    return s;
}

function Read32( buffer, offset ){
    return buffer.readUInt32BE(offset);
}

function Read16( buffer, offset ){
    return buffer.readUInt16BE(offset);
}

function Read8( buffer, offset ){
    return buffer.readUInt8(offset);
}

function ReadFloat( buffer, offset ){
    return buffer.readFloatBE( offset );
}

function GetImageElement( buffer, offset, count ){
    var element = [];
    // 780 - 852 = 72
    element.data_sign = Read32( buffer, 780 );
    element.low_data = Read32( buffer, 784 );
    element.low_quantity = ReadFloat( buffer, 788 );
    element.high_data = Read32( buffer, 792 );
    element.high_quantity = ReadFloat( buffer, 796 );
    element.descriptor = Read8( buffer, 800 );
    element.transfer = Read8( buffer, 801 );
    element.colorimetric = Read8( buffer, 802 );
    element.bit_size = Read8( buffer, 803 );
    element.packing = Read16( buffer, 804 );
    element.encoding = Read16( buffer, 806 );
    element.data_offset = Read32( buffer, 808 );
    element.eol_padding = Read32( buffer, 812 );
    element.eoi_padding = Read32( buffer, 816 );
    element.description = ReadBytes( buffer, 820, 32 );
    return element;
}

function DPXFileInfo( buffer ){
    var dpx_file_info = [];
    dpx_file_info.magic = ReadBytes( buffer, 0, 4 );
    dpx_file_info.offset = Read32( buffer, 4 );
    dpx_file_info.version = ReadBytes( buffer, 8, 8 );
    dpx_file_info.filesize = Read32( buffer, 16 );
    dpx_file_info.filename = ReadBytes( buffer, 36, 100 );
    dpx_file_info.timestamp = ReadBytes( buffer, 136, 24 );
    dpx_file_info.creator = ReadBytes( buffer, 160, 100 );
    dpx_file_info.project = ReadBytes( buffer, 260, 200 );
    dpx_file_info.copyright = ReadBytes( buffer, 460, 200 );
    dpx_file_info.encrypt_key = Read32( buffer, 660 );
    dpx_file_info.reserved = ReadBytes( buffer, 664, 104 ); 
    return dpx_file_info;
}

function DPXImageInfo( buffer ){
    var dpx_image_info = [];
    dpx_image_info.orientation = Read16( buffer, 768 );
    dpx_image_info.number_of_elements = Read16( buffer, 770 );
    dpx_image_info.width = Read32( buffer, 772 );
    dpx_image_info.height = Read32( buffer, 776 );
    dpx_image_info.image_elements = GetImageElement( buffer, 780, 0 ); 
    dpx_image_info.reserved = ReadBytes( buffer, 1356, 52 );
    return dpx_image_info;
}

function DPXOrientationInfo( buffer ){
    var dpx_orient_info = [];
    dpx_orient_info.x_offset = Read32( buffer, 1408 );
    dpx_orient_info.y_offset = Read32( buffer, 1412 );
    dpx_orient_info.x_center = ReadFloat( buffer, 1416 );
    dpx_orient_info.y_center = ReadFloat( buffer, 1420 );
    dpx_orient_info.x_size = Read32( buffer, 1424 );
    dpx_orient_info.y_size = Read32( buffer, 1428 );
    dpx_orient_info.source_name = ReadBytes( buffer, 1432, 100 );
    dpx_orient_info.source_time = ReadBytes( buffer, 1532, 24 );
    dpx_orient_info.input_device = ReadBytes( buffer, 1556, 32 );
    dpx_orient_info.input_serial = ReadBytes( buffer, 1588, 32 );
    dpx_orient_info.border = { 'x_left': Read16( buffer, 1620 ), 'x_right': Read16( buffer, 1622 ), 'y_left': Read16( buffer, 1624 ), 'y_right': Read16( buffer, 1626 ) };
    dpx_orient_info.aspect_ratio = [ Read32( buffer, 1628 ), Read32( buffer, 1632 ) ];
    dpx_orient_info.reserved = ReadBytes( buffer, 1636, 28 );
    return dpx_orient_info;
}

function DPXFilmInfo( buffer ){
    var dpx_film_info = [];
    dpx_film_info.manufacturer_id = ReadBytes( buffer, 1664, 2 );
    dpx_film_info.film_type = ReadBytes( buffer, 1666, 2 );
    dpx_film_info.perf_offset = ReadBytes( buffer, 1668, 2 );
    dpx_film_info.prefix = ReadBytes( buffer, 1670, 6 );
    dpx_film_info.count = ReadBytes( buffer, 1676, 4 );
    dpx_film_info.format = ReadBytes( buffer, 1680, 32 );
    dpx_film_info.frame_position = Read32( buffer, 1712 );
    dpx_film_info.frame_sequence = Read32( buffer, 1716 );
    dpx_film_info.held_count = Read32( buffer, 1720 );
    dpx_film_info.frame_rate = ReadFloat( buffer, 1724 );
    dpx_film_info.shutter_angle = ReadFloat( buffer, 1728 );
    dpx_film_info.frame_id = ReadBytes( buffer, 1732, 32 );
    dpx_film_info.slate = ReadBytes( buffer, 1764, 100 );
    dpx_film_info.reserved = ReadBytes( buffer, 1864, 56 );
    return dpx_film_info;
}

function DPXTVInfo( buffer ){
    var dpx_tv_info = [];
    dpx_tv_info.time_code = Read32( buffer, 1920 );
    dpx_tv_info.user_bits = Read32( buffer, 1924 );
    dpx_tv_info.interlace = Read8( buffer, 1928 );
    dpx_tv_info.field_number = Read8( buffer, 1929 );
    dpx_tv_info.video_signal = Read8( buffer, 1930 );
    dpx_tv_info.padding = Read8( buffer, 1931 );
    dpx_tv_info.horizontal_sample_rate = ReadFloat( buffer, 1932 );
    dpx_tv_info.vertical_sample_rate = ReadFloat( buffer, 1936 );
    dpx_tv_info.frame_rate = ReadFloat( buffer, 1940 );
    dpx_tv_info.time_offset = ReadFloat( buffer, 1944 );
    dpx_tv_info.gamma = ReadFloat( buffer, 1948 );
    dpx_tv_info.black_level = ReadFloat( buffer, 1952 );
    dpx_tv_info.black_gain = ReadFloat( buffer, 1956 );
    dpx_tv_info.break_point = ReadFloat( buffer, 1960 );
    dpx_tv_info.white_level = ReadFloat( buffer, 1964 );
    dpx_tv_info.integration_times = ReadFloat( buffer, 1968 );
    dpx_tv_info.reserved = ReadBytes( buffer, 1972, 76 );
    return dpx_tv_info;
}

function DPXUserInfo( buffer ){
    var dpx_user_info = [];
    dpx_user_info.id = ReadBytes( 2048, 32 );
    return dpx_user_info;
}

// Read DPX Header
fs.open( process.argv[2], 'r', function( err, fd ){
    if ( err ) throw err;
    
    var len = 8192;
    var pos = 0;
    var buffer = new Buffer(len);

    fs.read( fd, buffer, 0, len, pos, function( err, bytesRead, buffer ){
        // DPXFileInfo
        console.log( buffer );
        var dpx = DPXFileInfo( buffer );
        console.log( dpx );

        // DPXImageInfo
        var dpx_image_info = DPXImageInfo( buffer );
        console.log( dpx_image_info );

        // DPXOrientationInfo
        var dpx_orient_info = DPXOrientationInfo( buffer );
        console.log( dpx_orient_info );

        // DPXFilmInfo 
        var dpx_film_info = DPXFilmInfo( buffer );
        //console.log( dpx_film_info );

        // DPXTVInfo 
        var dpx_tv_info = DPXTVInfo( buffer );
        //console.log( dpx_tv_info );

        // DPXUserInfo 
        var dpx_user_info = DPXUserInfo( buffer );
        //console.log( dpx_user_info );
    });

    //len = 519840;
    len = 1824;
    var imgdata = new Buffer(len);
    fs.read( fd, imgdata, 0, len, 8192, function( err, bytesRead, imgdata ){
        console.log( imgdata );  
        //console.log( ReadBytes( imgdata, 0, 1824 ) );
    });
}); 
