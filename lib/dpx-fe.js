/*
 * DPX Image Reader 
 * Armen Filipetyan
 * MIT Licensed
 *  
 * Further edits by Oliver Harris
 * Needed rejig of 'render10Bit' function to parse any 10-bit DPX file
 */

var DPXFile = function( buffer ){
    this._buffer = buffer;
    
    // Enums 
    this.DATASIGN = Object.freeze({
        0 : 'UNSIGNED', 
        1 : 'SIGNED'
    });

    this.DESCRIPTOR = Object.freeze({
        0 : 'UNDEFINED',
        1 : 'RED',
        2 : 'GREEN',
        3 : 'BLUE',
        4 : 'ALPHA',
        6 : 'LUMINANCE',
        7 : 'CHROMA',       // Color Difference CbCr
        8 : 'DEPTH',
        9 : 'COMPOSITE',    // Composite Video
        50: 'RGB',
        51: 'RGBA',
        52: 'ABGR',
        53: 'BGR',
        100: 'YUV422',      // CbYCrY422
        101: 'YUV4224',     // CbYCrYA4224
        102: 'YUV444',      // CbYCr444
        103: 'YUV4444',     // CbYCrA4444
        150: 'USER'
    }); 

    this.TRANSFER = Object.freeze({
        0 : 'USER',
        1 : 'PRINT',
        2 : 'LINEAR',
        3 : 'LOG',
        4 : 'UNDEFINED',
        5 : 'SMTPE_274M',
        6 : 'ITU_R709',    // Rec709
        7 : 'ITU_R601_625L',
        8 : 'ITU_R601_525L',
        9 : 'NTSC',
        10: 'PAL',
        11: 'ZDEPTH',      // ZDepth Linear
        12: 'DEPTH'        // Depth Homogeneous
    });

    this.ORIENTATION = Object.freeze({
        0 : 'LEFT_RIGHT_TOP_BOTTOM',
        1 : 'RIGHT_LEFT_TOP_BOTTOM',
        2 : 'LEFT_RIGHT_BOTTOM_TOP',
        3 : 'RIGHT_LEFT_BOTTOM_TOP',
        4 : 'TOP_BOTTOM_LEFT_RIGHT',
        5 : 'TOP_BOTTOM_RIGHT_LEFT',
        6 : 'BOTTOM_TOP_LEFT_RIGHT',
        7 : 'BOTTOM_TOP_RIGHT_LEFT'
    });

    this.PACKING = Object.freeze({
        0 : 'PACKED',      // Standard Packing Into 32-bit Words
        1 : 'FILLED_A',    // SDPX V1.0
        2 : 'FILLED_B'     // SDPX V2.0 
    });

    this.ENCODING = Object.freeze({
        0 : 'NONE',
        1 : 'RLE'          // Run Length Encoding
    });

    // Read Functions
    this.ReadBytes = function( offset, len ){
        return this._buffer.substr( offset, len ); 
    };

    this.Read8 = function( offset ){
        return this._buffer.charCodeAt( offset ) & 0xFF;
    };

    this.Read16 = function( offset ){
        return ((this._buffer.charCodeAt( offset ) & 0xFF ) << 8) + 
            (this._buffer.charCodeAt( offset+1 ) & 0xFF );
    };

    this.Read32 = function( offset ){
        return ((( this._buffer.charCodeAt( offset ) & 0xFF ) << 24 ) +
            (( this._buffer.charCodeAt( offset+1 ) & 0xFF ) << 16 ) +
            (( this._buffer.charCodeAt( offset+2 ) & 0xFF ) << 8 ) +
            ( this._buffer.charCodeAt( offset+3 ) & 0xFF )) >>> 0;
    };

    this.ReadFloat = function( offset ){
        return parseFloat( this.Read32( offset ) ); 
    };

    this.GetImageElement = function( offset, count ){
        var element = [];
        element.data_sign = this.Read32( 780 );
        element.low_data = this.Read32( 784 );
        element.low_quantity = this.ReadFloat( 788 );
        element.high_data = this.Read32( 792 );
        element.high_quantity = this.ReadFloat( 796 );
        element.descriptor = this.Read8( 800 );
        element.transfer = this.Read8( 801 );
        element.colorimetric = this.Read8( 802 );
        element.bit_size = this.Read8( 803 );
        element.packing = this.Read16( 804 );
        element.encoding = this.Read16( 806 );
        element.data_offset = this.Read32( 808 );
        element.eol_padding = this.Read32( 812 );
        element.eoi_padding = this.Read32( 816 );
        element.description = this.ReadBytes( 820, 32 );
        return element;
    };

    this.DPXFileInfo = function(){
        var dpx_file_info = [];
        dpx_file_info.magic = this.ReadBytes( 0, 4 );
        dpx_file_info.offset = this.Read32( 4 );
        dpx_file_info.version = this.ReadBytes( 8, 8 );
        dpx_file_info.filesize = this.Read32( 16 );
        dpx_file_info.filename = this.ReadBytes( 36, 100 );
        dpx_file_info.timestamp = this.ReadBytes( 136, 24 );
        dpx_file_info.creator = this.ReadBytes( 160, 100 );
        dpx_file_info.project = this.ReadBytes( 260, 200 );
        dpx_file_info.copyright = this.ReadBytes( 460, 200 );
        dpx_file_info.encrypt_key = this.Read32( 660 );
        dpx_file_info.reserved = this.ReadBytes( 664, 104 ); 
        return dpx_file_info;
    };

    this.DPXImageInfo = function( buffer ){
        var dpx_image_info = [];
        dpx_image_info.orientation = this.Read16( 768 );
        dpx_image_info.number_of_elements = this.Read16( 770 );
        dpx_image_info.width = this.Read32( 772 );
        dpx_image_info.height = this.Read32( 776 );
        dpx_image_info.image_elements = this.GetImageElement( 780, 0 ); 
        dpx_image_info.reserved = this.ReadBytes( 1356, 52 );
        return dpx_image_info;
    };

    this.DPXOrientationInfo = function(){
        var dpx_orient_info = [];
        dpx_orient_info.x_offset = this.Read32( 1408 );
        dpx_orient_info.y_offset = this.Read32( 1412 );
        dpx_orient_info.x_center = this.ReadFloat( 1416 );
        dpx_orient_info.y_center = this.ReadFloat( 1420 );
        dpx_orient_info.x_size = this.Read32( 1424 );
        dpx_orient_info.y_size = this.Read32( 1428 );
        dpx_orient_info.source_name = this.ReadBytes( 1432, 100 );
        dpx_orient_info.source_time = this.ReadBytes( 1532, 24 );
        dpx_orient_info.input_device = this.ReadBytes( 1556, 32 );
        dpx_orient_info.input_serial = this.ReadBytes( 1588, 32 );
        dpx_orient_info.border = { 'x_left': this.Read16( 1620 ), 'x_right': this.Read16( 1622 ), 'y_left': this.Read16( 1624 ), 'y_right': this.Read16( 1626 ) };
        dpx_orient_info.aspect_ratio = [ this.Read32( 1628 ), this.Read32( 1632 ) ];
        dpx_orient_info.reserved = this.ReadBytes( 1636, 28 );
        return dpx_orient_info;
    };

    this.DPXFilmInfo = function(){
        var dpx_film_info = [];
        dpx_film_info.manufacturer_id = this.ReadBytes( 1664, 2 );
        dpx_film_info.film_type = this.ReadBytes( 1666, 2 );
        dpx_film_info.perf_offset = this.ReadBytes( 1668, 2 );
        dpx_film_info.prefix = this.ReadBytes( 1670, 6 );
        dpx_film_info.count = this.ReadBytes( 1676, 4 );
        dpx_film_info.format = this.ReadBytes( 1680, 32 );
        dpx_film_info.frame_position = this.Read32( 1712 );
        dpx_film_info.frame_sequence = this.Read32( 1716 );
        dpx_film_info.held_count = this.Read32( 1720 );
        dpx_film_info.frame_rate = this.ReadFloat( 1724 );
        dpx_film_info.shutter_angle = this.ReadFloat( 1728 );
        dpx_film_info.frame_id = this.ReadBytes( 1732, 32 );
        dpx_film_info.slate = this.ReadBytes( 1764, 100 );
        dpx_film_info.reserved = this.ReadBytes( 1864, 56 );
        return dpx_film_info;
    };

    this.DPXTVInfo = function(){
        var dpx_tv_info = [];
        dpx_tv_info.time_code = this.Read32( 1920 );
        dpx_tv_info.user_bits = this.Read32( 1924 );
        dpx_tv_info.interlace = this.Read8( 1928 );
        dpx_tv_info.field_number = this.Read8( 1929 );
        dpx_tv_info.video_signal = this.Read8( 1930 );
        dpx_tv_info.padding = this.Read8( 1931 );
        dpx_tv_info.horizontal_sample_rate = this.ReadFloat( 1932 );
        dpx_tv_info.vertical_sample_rate = this.ReadFloat( 1936 );
        dpx_tv_info.frame_rate = this.ReadFloat( 1940 );
        dpx_tv_info.time_offset = this.ReadFloat( 1944 );
        dpx_tv_info.gamma = this.ReadFloat( 1948 );
        dpx_tv_info.black_level = this.ReadFloat( 1952 );
        dpx_tv_info.black_gain = this.ReadFloat( 1956 );
        dpx_tv_info.break_point = this.ReadFloat( 1960 );
        dpx_tv_info.white_level = this.ReadFloat( 1964 );
        dpx_tv_info.integration_times = this.ReadFloat( 1968 );
        dpx_tv_info.reserved = this.ReadBytes( 1972, 76 );
        return dpx_tv_info;
    };

    this.DPXUserInfo = function(){
        var dpx_user_info = [];
        dpx_user_info.id = this.ReadBytes( 2048, 32 );
        return dpx_user_info;
    };

    // Rasterization
    this.render10Bit = function( canvas, imageData ){
        img = document.getElementById( canvas );
        context = img.getContext('2d');
        
        output = context.createImageData( img.width, img.height );
        imgData = output.data;

        scanlineArray = [];
        for (let y = 0; y < img.height; y++) {
          scanline = img.width * y;
          scanlineArray.push(scanline);
        }        
       
        errorArray = [];
        scanlineArray.forEach((item, index, array) => {
            for ( var x = 0; x < img.width; ++x ) {
                px = (x + item) * 4; 
                // handle potential horizontal error with empty strings (non-numerical value)
                pixel = (imageData[px] ? (imageData[px].charCodeAt(0) << 24) : '') +
                (imageData[px + 1] ? (imageData[px + 1].charCodeAt(0) << 16) : '') +
                (imageData[px + 2] ? (imageData[px + 2].charCodeAt(0) << 8) : '') +
                (imageData[px + 3] ? imageData[px + 3].charCodeAt(0) : '');
                // need to pick up first error by recording first horizontal values
                if (pixel === '') {
                  errorArray.push(x);
                } else {
                    R = (pixel >> 24) & 0xff;
                    G = (pixel >> 14) & 0xff; 
                    B = (pixel >> 4) & 0xff; 
          
                    imgData[px] = R; 
                    imgData[px+1] = G; 
                    imgData[px+2] = B; 
                    imgData[px+3] = 255; 
                }               
            }
        });
        // fix horizontal error
        if (errorArray[0]) {
            // first move across image to correct position
            context.putImageData(output, -errorArray[0], 0);
            // paste in second half
            context.putImageData(output, img.width - errorArray[0], 0);
        } else {
            // if no error, process as normal
            context.putImageData(output, 0, 0);
        }

    };
};
