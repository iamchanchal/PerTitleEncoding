var inputVideoFile = "../resource/TOS1min.mp4";
var ffmpeg = require('fluent-ffmpeg');
var fs = require('fs');

var timeOut;

var psnrBitrateList = new Array(12);
for (var i = 0; i < 12; i++) {
    psnrBitrateList[i] = new Array(2);
}
var jsonFile = "../resource/reverse/TOS1json.txt";


var loopEncode = function(i,length,breadth,psnrBitrateCounter,timeOut) {

    if(length==640&&breadth==480&&psnrBitrateCounter>3){
        length=1080; breadth=720;i=18;
    }
    if(length==1080&&breadth==720&&psnrBitrateCounter>7)
    {
        length=1920; breadth=1080;i=18;
    }
    if (length==1920&&breadth==1080&&i>33) {
        return 1;
    }
    if(length==640&&breadth==480&&psnrBitrateCounter==0){
        processingInputFile(i,length,breadth,psnrBitrateCounter);
        loopEncode(i+5,length,breadth,psnrBitrateCounter+1,timeOut);
    }
    else {
        setTimeout(function(){
            processingInputFile(i,length,breadth,psnrBitrateCounter);
            loopEncode(i+5,length,breadth,psnrBitrateCounter+1,timeOut);
        }, timeOut);
    }
    /*else {
        processingInputFile(i,length,breadth,psnrBitrateCounter);
        loopEncode(i+5,length,breadth,psnrBitrateCounter+1);
    }*/

}

function processingInputFile(i,length,breadth,psnrBitrateCounter){
    var outputVideoFile = "../resource/reverse/IntermediateCRFEncoding"+length+"x"+breadth+"_"+i+".mp4";
    var y4mOutput = "../resource/reverse/y4mOutput"+length+"x"+breadth+"_"+i+".y4m";


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
            y4mcal(i,length,breadth,outputVideoFile,y4mOutput,psnrBitrateCounter);



        })

        .save(outputVideoFile);

}

//Converting the CRF encoded file to y4m by upscaling to the original video
function y4mcal(i,length,breadth,outputVideoFile,y4mOutput,psnrBitrateCounter) {
    var y4mConversion = ffmpeg(outputVideoFile)
        .addOption('-pix_fmt')
        .addOption('yuv420p')
        .addOptions('-vsync', '0', '-s', '1920x800') //need to change the resolution everytime;cant hardcode
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
            rawTomp4(i,length,breadth,y4mOutput,outputVideoFile,psnrBitrateCounter);
        })

        .save(y4mOutput);
}
//Converting raw y4m file to mp4
function rawTomp4(i,length,breadth,y4mOutput,outputVideoFile,psnrBitrateCounter) {
    var finalOutput = "../resource/reverse/finalUpscaledOutput"+length+"x"+breadth+"_"+i+".mp4";
    var rawToMP4 = ffmpeg(y4mOutput)
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
            //deleteUnusedFile(outputVideoFile);
            psnrcal(i,length,breadth,y4mOutput,finalOutput,psnrBitrateCounter);

        })

        .save(finalOutput);
}
//method to calculate PSNR by upscaling the output video file and printing PSNR in a text file
function psnrcal(i,length,breadth,y4mOutput,finalOutput,psnrBitrateCounter) {

    var psnrAfter = ffmpeg(inputVideoFile)
        .input(y4mOutput)
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
                deleteUnusedFile(y4mOutput);
                if(psnrBitrateCounter==8){
                    printHullPoints();
                }
            });


        })
        .output('nowhere')
        .run();
}

function deleteUnusedFile(file) {
    var fs = require("fs");
    fs.unlinkSync(file);
}

function mainFn(){
/*    var defer = require('node-defer');
    var promise = defer(function(){
        ffmpeg.ffprobe(inputVideoFile, (error, metadata) => {
            var duration = metadata.format.duration;
            console.log("duration of the original video is::"+duration);
            timeOut = duration*2000;
        });
    });
    promise.then(loopEncode(18,640,480,0,timeOut));*/

    function calculateDuration(){
        return new Promise(function (resolve, reject) {
            ffmpeg.ffprobe(inputVideoFile, (error, metadata) => {
                if(error) {
                    reject(error);
                } else {
                    var duration = metadata.format.duration;
                    console.log("duration of the original video is::" + duration);
                    timeOut = duration * 6000;
                    resolve(timeOut);
                }
            });

        });

    }
    calculateDuration()
        .then(function (timeOut) {
        loopEncode(18,640,480,0,timeOut)// promise-returning async function
    });


}



function printHullPoints() {
    var fs = require("fs");

    var hull = require('../lib/hull.js');
    var hullPoints = new Array(hull(psnrBitrateList));
    var hullFile = "../resource/reverse/TOS1hull.txt";
    fs.writeFile(hullFile, '', function () {
        console.log('done overwriting contents of hull file if it exists!')
    });
    var hullstream = fs.createWriteStream(hullFile, {flags: 'a'});

    hullstream.write("Here come the Hull Points");
    console.log("Here come the Hull Points");

    for (var r = 0; r < hullPoints.length; r++) {
        for (var k = 0; k < hullPoints[r].length; k++) {
            hullstream.write("\n"+ "HullPSNR:"+hullPoints[r][k][0] + "...HullBitrate:" + hullPoints[r][k][1]);
            console.log("\n"+ "HullPSNR:"+hullPoints[r][k][0] + "...HullBitrate:" + hullPoints[r][k][1]);

        }

    }
}

mainFn();
