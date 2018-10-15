var inputVideoFile = "../resource/BBB2min.mp4";
var ffmpeg = require('fluent-ffmpeg');
var fs = require('fs');
var psnrBitrateList = new Array(6);
for (var i = 0; i < 6; i++) {
    psnrBitrateList[i] = new Array(2);
}
var jsonFile = "../resource/reverse/json.txt";


var loopEncode = function(i,length,breadth,psnrBitrateCounter) {
    if(length==640&&breadth==480&&psnrBitrateCounter>1){
        length=1080; breadth=720;i=28;
    }
    if(length==1080&&breadth==720&&psnrBitrateCounter>3)
    {
        length=1920; breadth=1080;i=28;
    }
    if (length==1920&&breadth==1080&&i>33) {
        return 1;
    }
    else if(i!=18){
        setTimeout(function(){
            processingInputFile(i,length,breadth,psnrBitrateCounter);
            loopEncode(i+5,length,breadth,psnrBitrateCounter+1);
        }, 180000);
    }
    else {
        processingInputFile(i,length,breadth,psnrBitrateCounter);
        loopEncode(i+5,length,breadth,psnrBitrateCounter+1);
    }

}

function processingInputFile(i,length,breadth,psnrBitrateCounter){
    var outputVideoFile = "../resource/reverse/IntermediateCRFEncoding"+length+"x"+breadth+"_"+i+".mp4";
    var midOutput = "../resource/reverse/y4mOutput"+length+"x"+breadth+"_"+i+".y4m";


//saving console log message in a text file
    var logFile = "../resource/log"+length+"x"+breadth+"_"+i+".txt";

    var util = require('util');
    var logFile = fs.createWriteStream(logFile, { flags: 'a' });
    var logStdout = process.stdout;
    console.log = function () {
        logFile.write(util.format.apply(null, arguments) + '\n');
        logStdout.write(util.format.apply(null, arguments) + '\n');
    }
    console.error = console.log;

//CRF encoding the input file by downscaling and printing PSNR in a text file
    var crf = "-crf "+i;
    var resolution = length+"x"+breadth;
    var encoding = ffmpeg(inputVideoFile)
        .size(resolution)
        .addOption(crf)
        .on('start', function(commandLine) {
            console.log('Spawned Ffmpeg with command: ' + commandLine);
        })
        .on('progress', function(progress) {
            console.log(JSON.stringify(progress));
        })
        .on('data', function (data) {
            var frame = new Buffer(data).toString('base64');
            console.log(frame);
        })
        .on('error', function (err) {
            console.log('An error occurred: ' + err.message);
        })
        .on('end', function (err,stdout, stderr) {
            console.log('Processing CRF encoding finished !');
            console.log(JSON.stringify(stdout, null, " "));
            y4mcal(i,length,breadth,outputVideoFile,midOutput,psnrBitrateCounter);



        })

        .save(outputVideoFile);

}

//Converting the CRF encoded file to y4m by upscaling to the original video
function y4mcal(i,length,breadth,outputVideoFile,midOutput,psnrBitrateCounter) {
    var y4mConversion = ffmpeg(outputVideoFile)
        .addOption('-pix_fmt')
        .addOption('yuv420p')
        .addOptions('-vsync', '0', '-s', '1920x1080')
        .outputOption('-sws_flags lanczos')
        .on('start', function (commandLine) {
            console.log('Spawned Ffmpeg with command: ' + commandLine);
        })
        .on('progress', function (progress) {
            console.log(JSON.stringify(progress));
        })
        .on('data', function (data) {
            var frame = new Buffer(data).toString('base64');
            console.log(frame);
        })
        .on('error', function (err) {
            console.log('An error occurred: ' + err.message);
        })
        .on('end', function (err, stdout, stderr) {
            console.log('Processing CRF encoding finished !');
            console.log(JSON.stringify(stdout, null, " "));
            rawTomp4(i,length,breadth,midOutput,psnrBitrateCounter);
        })

        .save(midOutput);
}
//Converting raw y4m file to mp4
function rawTomp4(i,length,breadth,midOutput,psnrBitrateCounter) {
    var finalOutput = "../resource/reverse/finalUpscaledOutput"+length+"x"+breadth+"_"+i+".mp4";
    var rawToMP4 = ffmpeg(midOutput)
        .addOption('-c:v libx264')
        .on('start', function(commandLine) {
            console.log('Spawned Ffmpeg with command: ' + commandLine);
        })
        .on('progress', function(progress) {
            console.log(JSON.stringify(progress));
        })
        .on('data', function (data) {
            var frame = new Buffer(data).toString('base64');
            console.log(frame);
        })
        .on('error', function (err) {
            console.log('An error occurred: ' + err.message);
        })
        .on('end', function (err,stdout, stderr) {
            console.log('Processing CRF encoding finished !');
            console.log(JSON.stringify(stdout, null, " "));
            psnrcal(i,length,breadth,midOutput,finalOutput,psnrBitrateCounter);

        })

        .save(finalOutput);
}
//method to calculate PSNR by upscaling the output video file and printing PSNR in a text file
function psnrcal(i,length,breadth,midOutput,finalOutput,psnrBitrateCounter) {

    var psnrAfter = ffmpeg(inputVideoFile)
        .input(midOutput)
        .complexFilter(['psnr'])
        .addOption('-f', 'null')
        .on('start', function (commandLine) {
            console.log('Spawned Ffmpeg with command: ' + commandLine);
        })
        .on('progress', function (progress) {
            console.log(JSON.stringify(progress));
        })
        .on('data', function (data) {
            var frame = new Buffer(data).toString('base64');
            console.log(frame);
        })
        .on('error', function (err) {
            console.log('An error occurred: ' + err.message);
        })
        .on('end', function (err, stdout, stderr, metadata) {
            console.log('Processing for PSNR finished !');

            console.log(JSON.stringify(stdout, null, " "));
            var averagePSNR = JSON.stringify(stdout, null, " ").match("average:(.*)min:");
            var fs = require("fs");
            var psnrFile = "../resource/reverse/PSNR"+length+"x"+breadth+"_"+i+".txt";
            var bitrateFile = "../resource/reverse/Bitrate"+length+"x"+breadth+"_"+i+".txt";
            fs.writeFile(psnrFile, '', function(){console.log('done overwriting contents of psnr file if it exists!')})
            var PSNRstream = fs.createWriteStream(psnrFile, {flags:'a'});
            fs.writeFile(bitrateFile, '', function(){console.log('done overwriting contents of bitrate file if it exists!')})
            var Bitratestream = fs.createWriteStream(bitrateFile, {flags:'a'});
            PSNRstream.write(averagePSNR[1]+ "\n");
            var jsonstream = fs.createWriteStream(jsonFile, {flags: 'a'});
            ffmpeg.ffprobe(finalOutput, function(err, metadata) {
                Bitratestream.write(metadata.streams[0].bit_rate+ "\n");
                psnrBitrateList[psnrBitrateCounter][0] = averagePSNR[1];
                psnrBitrateList[psnrBitrateCounter][1] = metadata.streams[0].bit_rate;
                jsonstream.write("PSNR"+length+"x"+breadth+"_"+i+":"+psnrBitrateList[psnrBitrateCounter][0] + "...Bitrate"+length+"x"+breadth+"_"+i+":"+ psnrBitrateList[psnrBitrateCounter][1] + "\n");
                deleteY4M(midOutput);
                if(psnrBitrateCounter==5){
                    printGraphPoints();
                }
            });


        })
        .output('nowhere')
        .run();
}

function deleteY4M(midOutput) {
    var fs = require("fs");
    fs.unlinkSync(midOutput);
}

function mainFn(){
    loopEncode(28,640,480,0);

}

function printGraphPoints() {
    var r;

    var fs = require("fs");

/*    fs.writeFile(jsonFile, '', function () {
        console.log('done overwriting contents of json file if it exists!')
    });



    for (r = 0; r < psnrBitrateList.length; r++) {

        console.log("PSNR:"+psnrBitrateList[r][0] + "...Bitrate:"+ psnrBitrateList[r][1] + "\n");

    }*/

    var hull = require('../lib/hull.js');
    var hullPoints = new Array(hull(psnrBitrateList, 1000000000));
    var hullFile = "../resource/reverse/hull.txt";
    fs.writeFile(hullFile, '', function () {
        console.log('done overwriting contents of hull file if it exists!')
    });
    var hullstream = fs.createWriteStream(hullFile, {flags: 'a'});

    hullstream.write("Here come the Hull Points");
    console.log("Here come the Hull Points");

    for (r = 0; r < hullPoints.length; r++) {
        for (var k = 0; k < hullPoints[r].length; k++) {
            hullstream.write("\n"+ "HullPSNR:"+hullPoints[r][k][0] + "...HullBitrate:" + hullPoints[r][k][1]);
            console.log("\n"+ "HullPSNR:"+hullPoints[r][k][0] + "...HullBitrate:" + hullPoints[r][k][1]);

        }

    }
}

mainFn();
