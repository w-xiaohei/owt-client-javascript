// MIT License
//
// Copyright (c) 2012 Universidad Politécnica de Madrid
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

// Copyright (C) <2018> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

// This file is borrowed from lynckia/licode with some modifications.

/*global require, __dirname, console, process*/
'use strict';

var express = require('express'),
  spdy = require('spdy'),
  bodyParser = require('body-parser'),
  errorhandler = require('errorhandler'),
  morgan = require('morgan'),
  fs = require('fs'),
  https = require('https'),
  icsREST = require('./rest');

var app = express();

// app.configure ya no existe
app.use(errorhandler());
app.use(morgan('dev'));
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.disable('x-powered-by');

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, PATCH, OPTIONS, DELETE');
  res.header('Access-Control-Allow-Headers', 'origin, content-type');
  res.header('Strict-Transport-Security', 'max-age=1024000; includeSubDomain');
  res.header('X-Content-Type-Options', 'nosniff');
  if (req.method == 'OPTIONS') {
    res.send(200);
  } else {
    next();
  }
});

icsREST.API.init('_service_ID_', '_service_KEY_', 'https://localhost:3000/', false);

var sampleRoom;
var pageOption = { page: 1, per_page: 100 };
(function initSampleRoom () {
  icsREST.API.getRooms(pageOption, function(rooms) {
    console.log(rooms.length + ' rooms in this service.');
    for (var i = 0; i < rooms.length; i++) {
      if (sampleRoom === undefined && rooms[i].name === 'sampleRoom') {
        sampleRoom = rooms[i]._id;
        console.log('sampleRoom Id:', sampleRoom);
      }
      if (sampleRoom !== undefined) {
        break;
      }
    }
    var tryCreate = function(room, callback) {
      var options = {};
      icsREST.API.createRoom(room.name, options, function(roomId) {
        console.log('Created room:', roomId._id);
        callback(roomId._id);
      }, function(status, err) {
        console.log('Error in creating room:', err, '[Retry]');
        setTimeout(function() {
          tryCreate(room, options, callback);
        }, 100);
      }, room);
    };

    var room;
    if (!sampleRoom) {
      room = {
        name: 'sampleRoom'
      };
      tryCreate(room, function(Id) {
        sampleRoom = Id;
        console.log('sampleRoom Id:', sampleRoom);
      });
    }
  }, function(stCode, msg) {
    console.log('getRooms failed(', stCode, '):', msg);
  });
})();


////////////////////////////////////////////////////////////////////////////////////////////
// legacy interface begin
// /////////////////////////////////////////////////////////////////////////////////////////
app.get('/getUsers/:room', function(req, res) {
  var room = req.params.room;
  icsREST.API.getParticipants(room, function(users) {
    res.send(users);
  }, function(err) {
    res.send(err);
  });
});

app.post('/createToken/', function(req, res) {
  var room = req.body.room || sampleRoom,
    username = req.body.username,
    role = req.body.role;
  //FIXME: The actual *ISP* and *region* info should be retrieved from the *req* object and filled in the following 'preference' data.
  var preference = {isp: 'isp', region: 'region'};
  icsREST.API.createToken(room, username, role, preference, function(token) {
    res.send(token);
  }, function(err) {
    res.send(err);
  });
});

app.post('/createRoom/', function(req, res) {
  'use strict';
  var name = req.body.name;
  var options = req.body.options;
  icsREST.API.createRoom(name, options, function(response) {
    res.send(response);
  }, function(err) {
    res.send(err);
  });
});
app.get('/getRooms/', function(req, res) {
  'use strict';
  icsREST.API.getRooms(pageOption, function(rooms) {
    res.send(rooms);
  }, function(err) {
    res.send(err);
  });
});

app.get('/getRoom/:room', function(req, res) {
  'use strict';
  var room = req.params.room;
  icsREST.API.getRoom(room, function(rooms) {
    res.send(rooms);
  }, function(err) {
    res.send(err);
  });
});

app.get('/room/:room/user/:user', function(req, res) {
  'use strict';
  var room = req.params.room;
  var participant_id = req.params.user;
  icsREST.API.getParticipant(room, participant_id, function(user) {
    res.send(user);
  }, function(err) {
    res.send(err);
  });
});

app.delete('/room/:room/user/:user', function(req, res) {
  'use strict';
  var room = req.params.room;
  var participant_id = req.params.user;
  icsREST.API.dropParticipant(room, participant_id, function(result) {
    res.send(result);
  }, function(err) {
    res.send(err);
  });
})

app.delete('/room/:room', function(req, res) {
  'use strict';
  var room = req.params.room;
  icsREST.API.deleteRoom(room, function(result) {
    res.send(result);
  }, function(err) {
    res.send(err);
  });
})
////////////////////////////////////////////////////////////////////////////////////////////
// legacy interface begin
// /////////////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////////////////
// New RESTful interface begin
// /////////////////////////////////////////////////////////////////////////////////////////
app.post('/rooms', function(req, res) {
  'use strict';
  var name = req.body.name;
  var options = req.body.options;
  icsREST.API.createRoom(name, options, function(response) {
    res.send(response);
  }, function(err) {
    res.send(err);
  });
});

app.get('/rooms', function(req, res) {
  'use strict';
  icsREST.API.getRooms(pageOption, function(rooms) {
    res.send(rooms);
  }, function(err) {
    res.send(err);
  });
});

app.get('/rooms/:room', function(req, res) {
  'use strict';
  var room = req.params.room;
  icsREST.API.getRoom(room, function(result) {
    res.send(result);
  }, function(err) {
    res.send(err);
  });
});

app.put('/rooms/:room', function(req, res) {
  'use strict';
  var room = req.params.room,
    config = req.body;
  icsREST.API.updateRoom(room, config, function(result) {
    res.send(result);
  }, function(err) {
    res.send(err);
  });
});

app.patch('/rooms/:room', function(req, res) {
  'use strict';
  var room = req.params.room,
    items = req.body;
  icsREST.API.updateRoomPartially(room, items, function(result) {
    res.send(result);
  }, function(err) {
    res.send(err);
  });
});

app.delete('/rooms/:room', function(req, res) {
  'use strict';
  var room = req.params.room;
  icsREST.API.deleteRoom(room, function(result) {
    res.send(result);
  }, function(err) {
    res.send(err);
  });
});

app.get('/rooms/:room/participants', function(req, res) {
  'use strict';
  var room = req.params.room;
  icsREST.API.getParticipants(room, function(participants) {
    res.send(participants);
  }, function(err) {
    res.send(err);
  });
});

app.get('/rooms/:room/participants/:id', function(req, res) {
  'use strict';
  var room = req.params.room;
  var participant_id = req.params.id;
  icsREST.API.getParticipant(room, participant_id, function(info) {
    res.send(info);
  }, function(err) {
    res.send(err);
  });
});

app.patch('/rooms/:room/participants/:id', function(req, res) {
  'use strict';
  var room = req.params.room;
  var participant_id = req.params.id;
  var items = req.body;
  icsREST.API.updateParticipant(room, participant_id, items, function(result) {
    res.send(result);
  }, function(err) {
    res.send(err);
  });
});

app.delete('/rooms/:room/participants/:id', function(req, res) {
  'use strict';
  var room = req.params.room;
  var participant_id = req.params.id;
  icsREST.API.dropParticipant(room, participant_id, function(result) {
    res.send(result);
  }, function(err) {
    res.send(err);
  });
});

app.get('/rooms/:room/streams', function(req, res) {
  'use strict';
  var room = req.params.room;
  icsREST.API.getStreams(room, function(streams) {
    res.send(streams);
  }, function(err) {
    res.send(err);
  });
});

app.get('/rooms/:room/streams/:stream', function(req, res) {
  'use strict';
  var room = req.params.room,
    stream_id = req.params.stream;
  icsREST.API.getStream(room, stream_id, function(info) {
    res.send(info);
  }, function(err) {
    res.send(err);
  });
});

app.patch('/rooms/:room/streams/:stream', function(req, res) {
  'use strict';
  var room = req.params.room,
    stream_id = req.params.stream,
    items = req.body;
  icsREST.API.updateStream(room, stream_id, items, function(result) {
    res.send(result);
  }, function(err) {
    res.send(err);
  });
});

app.delete('/rooms/:room/streams/:stream', function(req, res) {
  'use strict';
  var room = req.params.room,
    stream_id = req.params.stream;
  icsREST.API.deleteStream(room, stream_id, function(result) {
    res.send(result);
  }, function(err) {
    res.send(err);
  });
});

app.post('/rooms/:room/streaming-ins', function(req, res) {
  'use strict';
  var room = req.params.room,
    url = req.body.url,
    transport = req.body.transport,
    media = req.body.media;

  icsREST.API.startStreamingIn(room, url, transport, media, function(result) {
    res.send(result);
  }, function(err) {
    res.send(err);
  });
});

app.delete('/rooms/:room/streaming-ins/:id', function(req, res) {
  'use strict';
  var room = req.params.room,
    stream_id = req.params.id;
  icsREST.API.stopStreamingIn(room, stream_id, function(result) {
    res.send(result);
  }, function(err) {
    res.send(err);
  });
});

app.get('/rooms/:room/streaming-outs', function(req, res) {
  'use strict';
  var room = req.params.room;
  icsREST.API.getStreamingOuts(room, function(streamingOuts) {
    res.send(streamingOuts);
  }, function(err) {
    res.send(err);
  });
});

app.post('/rooms/:room/streaming-outs', function(req, res) {
  'use strict';
  var room = req.params.room,
    protocol = req.body.protocol,
    url = req.body.url,
    parameters = req.body.parameters,
    media = req.body.media;

  icsREST.API.startStreamingOut(room, protocol, url, parameters, media, function(info) {
    res.send(info);
  }, function(err) {
    res.send(err);
  });
});

app.patch('/rooms/:room/streaming-outs/:id', function(req, res) {
  'use strict';
  var room = req.params.room,
    id = req.params.id,
    commands = req.body;
  icsREST.API.updateStreamingOut(room, id, commands, function(result) {
    res.send(result);
  }, function(err) {
    res.send(err);
  });
});

app.delete('/rooms/:room/streaming-outs/:id', function(req, res) {
  'use strict';
  var room = req.params.room,
    id = req.params.id;
  icsREST.API.stopStreamingOut(room, id, function(result) {
    res.send(result);
  }, function(err) {
    res.send(err);
  });
});

app.get('/rooms/:room/recordings', function(req, res) {
  'use strict';
  var room = req.params.room;
  icsREST.API.getRecordings(room, function(recordings) {
    res.send(recordings);
  }, function(err) {
    res.send(err);
  });
});

app.post('/rooms/:room/recordings', function(req, res) {
  'use strict';
  var room = req.params.room,
    container = req.body.container,
    media = req.body.media;
  icsREST.API.startRecording(room, container, media, function(info) {
    res.send(info);
  }, function(err) {
    res.send(err);
  });
});

app.patch('/rooms/:room/recordings/:id', function(req, res) {
  'use strict';
  var room = req.params.room,
    id = req.params.id,
    commands = req.body;
  icsREST.API.updateRecording(room, id, commands, function(result) {
    res.send(result);
  }, function(err) {
    res.send(err);
  });
});

app.delete('/rooms/:room/recordings/:id', function(req, res) {
  'use strict';
  var room = req.params.room,
    id = req.params.id;
  icsREST.API.stopRecording(room, id, function(result) {
    res.send(result);
  }, function(err) {
    res.send(err);
  });
});

//Sip call management.
app.get('/rooms/:room/sipcalls', function(req, res) {
  'use strict';
  var room = req.params.room;
  icsREST.API.getSipCalls(room, function(sipCalls) {
    res.send(sipCalls);
  }, function(err) {
    res.send(err);
  });
});

app.post('/rooms/:room/sipcalls', function(req, res) {
  'use strict';
  var room = req.params.room,
    peerUri = req.body.peerURI,
    mediaIn = req.body.mediaIn,
    mediaOut = req.body.mediaOut;
  icsREST.API.makeSipCall(room, peerUri, mediaIn, mediaOut, function(info) {
    res.send(info);
  }, function(err) {
    res.send(err);
  });
});

app.patch('/rooms/:room/sipcalls/:id', function(req, res) {
  'use strict';
  var room = req.params.room,
    id = req.params.id,
    commands = req.body;
  icsREST.API.updateSipCall(room, id, commands, function(result) {
    res.send(result);
  }, function(err) {
    res.send(err);
  });
});

app.delete('/rooms/:room/sipcalls/:id', function(req, res) {
  'use strict';
  var room = req.params.room,
    id = req.params.id;
  icsREST.API.endSipCall(room, id, function(result) {
    res.send(result);
  }, function(err) {
    res.send(err);
  });
});

app.post('/tokens', function(req, res) {
  'use strict';
  var room = req.body.room || sampleRoom,
    user = req.body.user,
    role = req.body.role;

  //Note: The actual *ISP* and *region* information should be retrieved from the *req* object and filled in the following 'preference' data.
  var preference = {isp: 'isp', region: 'region'};
  icsREST.API.createToken(room, user, role, preference, function(token) {
    res.send(token);
  }, function(err) {
    res.status(401).send(err);
  });
});
/*******************add start************************************/
function respSuccess(resp, data) {
  const json = {
    state : true,
    code  : 200,
    message: "Success",
    data: data
  };
  resp.send(json);
}
function respError(resp, errCode, errMessage) {
  const json = {
    state : false,
    code  : errCode,
    message: errMessage
  };
  resp.send(json);
}
/**
*先查看房间有没有存在，如果已经存在则调用修改房间信息接口
**/
app.post('/createMcuRoom/',function(req,res){
  'use strict';
  const room = req.body.room;
  const members = req.body.members;
  icsREST.API.getRooms(pageOption,function(rooms){
    console.log(rooms.length+' rooms in this service');
    let is_room_exists = false;
    let room_id = 0 ;
    for(let i=0;i<rooms.length;i++){
      if(room == rooms[i].name){
        room_id = rooms[i]._id;
        is_room_exists = true;
        break;
      }
    }

    const options = {};
    if(is_room_exists){
      console.log("going to update room :"+roomid);
      icsREST.API.updateRoom(room_id,options,function(room){
        respSuccess(res,room);
      },function(code,err){
        respError(res,code,err);
      });
    }else{
      console.log("going to create room:"+room);
      icsREST.API.createRoom(room,options,function(room){
        respSuccess(res,room);
      },function(code,err){
        respError(res,code,err);
      });
    }
    console.log(options);
  })
});

app.get('/mcuRoom/:room',function(req,res){
  'use strict';
  const room = req.params.room;
  icsREST.API.getRooms(pageOption,function(rooms) {
    console.log(rooms.length + ' rooms in this service.');
    let is_room_exists = false;
    let room_id = 0;
    for (let i = 0; i < rooms.length; i++) {
      if (room == rooms[i].name) {
        is_room_exists = true;
        room_id = rooms[i]._id;
        break;
      }
    }
    if (!is_room_exists) {
      respError(res, 400, 'Room does not exist！');
      return;
    }
    respSuccess(res, {
      "_id": room_id
    });
  },function(code,err){
    respError(res,code,err);
  });
});

app.post('/joinMcuRoom/',function(req,res){
  'use strict';
  const room = req.body.room;
  icsREST.API.getRooms(pageOption,function(rooms){
    console.log(rooms.length+' rooms in this service');
    let is_room_exists = false;
    let room_id = 0 ;
    for(let i=0;i<rooms.length;i++){
      if(room == rooms[i].name){
        room_id = rooms[i]._id;
        is_room_exists = true;
        break;
      }
    }
    const options = {};
    if(is_room_exists){
      respSuccess(res,{_id:room_id});
    }else{
      console.log("going to create room:"+room);
      icsREST.API.createRoom(room,options,function(room){
        respSuccess(res,{_id:room._id});
      },function(code,err){
        respError(res,code,err);
      });
    }
    console.log(options);
  });
});

app.post('/mcuRoom/',function(req,res){
  'use strict';
  const room = req.body.room;
  icsREST.API.getRooms(pageOption,function(rooms){
    console.log(rooms.length+' rooms in this service.');
    let is_room_exists = false;
    let room_id = 0 ;
    for(let i=0;i<rooms.length;i++){
      if(room == rooms[i].name){
        is_room_exists = true;
        room_id = rooms[i]._id;
        break;
      }
    }
    if(!is_room_exists){
      respError(res,400,'Room does not exist!');
      return ;
    }
    respSuccess(res,{
      "_id":room_id
    });
  },function(code,err){
    respError(res,code,err);
  });
});

app.post('/updateMcuLayout/',function(req,res){
  'use strict';
  const room_id = req.body.roomId;
  const members = req.body.members;
  const layout_region = calculateLayout(members);
  console.log("going to update room: "+room_id);
  const options = {
    views:{
      video:{
        layout:{
          fitPolicy:"crop",
          templates:{
            base:"void",
            custom:layout_region.layout
          }
        }
      }
    }
  };

  icsREST.API.updateRoom(room_id,options,function(room){
    console.log(room);
    icsREST.API.getStreams(room_id,function(streams){
      const stream_array = [];
      let mix_stream_id = '';
      for(let index in streams){
        const stream = streams[index];
        if(stream.typs == 'forward'){
          stream_array.push(stream);
        }else if(stream.type=='mixed'){
          mix_stream_id = stream.id
        }
      }
      console.log("Forward Streams");
      console.log(stream_array);
      const values = [];
      for(let index in stream_array){
        const stream = stream_array[index];
        values.push(
            {
              stream:stream.id,
              region:layout_region.regions[index]
            }
        );
      }

      const layout_update_items=[
        {
          op:'replace',
          path:'/info/layout',
          value:values
        }
      ];
      icsREST.API.updateStream(room_id,mix_stream_id,layout_update_items,function(stream){
        console.log("update stream!");
        console.log(stream);
      },function(err){
        console.log("update err:"+err);
      });
      respSuccess(res,"");
    },function(code,err){
      respError(res,code,err);
    });
  },function(code,err){
    respError(res,code,err);
  });
});

function calculateLayout(members) {
  let regions = [];
  let layout = {};
  let region_count = 0;
  if (members == 1) {
    regions[0] = {
      "id": "1",
      "shape": "rectangle",
      "area": {
        "left": "0",
        "top": "0",
        "width": "1",
        "height": "1"
      }
    }
    layout = [
      {
        "region": [regions[0]]
      }
    ];
    region_count = 1;
  } else if (members == 2) {
    regions[0] = {
      "id": "1",
      "shape": "rectangle",
      "area": {
        "left": "0",
        "top": "0",
        "width": "1/2",
        "height": "1"
      }
    };
    regions[1] = {
      "id": "2",
      "shape": "rectangle",
      "area": {
        "left": "1/2",
        "top": "0",
        "width": "1/2",
        "height": "1"
      }
    };

    layout = [
      {
        "region": [regions[0],regions[1]]
      }
    ];
    region_count = 2;
  } else if (members == 21) {
    regions[0] = {
      "id": "1",
      "shape": "rectangle",
      "area": {
        "left": "0",
        "top": "0",
        "width": "1",
        "height": "1"
      }
    };
    regions[1] = {
      "id": "2",
      "shape": "rectangle",
      "area": {
        "left": "0",
        "top": "2/3",
        "width": "1/3",
        "height": "1/3"
      }
    };
  } else if (members == 22) {
    regions[0] = {
      "id": "1",
      "shape": "rectangle",
      "area": {
        "left": "0",
        "top": "0",
        "width": "1/2",
        "height": "1"
      }
    };
    regions[1] = {
      "id": "2",
      "shape": "rectangle",
      "area": {
        "left": "1/2",
        "top": "0",
        "width": "1/2",
        "height": "1"
      }
    };

    layout = [
      {
        "region": [regions[0],regions[1]]
      }
    ];
    region_count = 2;
  } else if (members == 3) {
    regions[0] = {
      "id": "1",
      "shape": "rectangle",
      "area": {
        "left": "0",
        "top": "0",
        "width": "1/2",
        "height": "2/3"
      }
    };
    regions[1] = {
      "id": "2",
      "shape": "rectangle",
      "area": {
        "left": "1/2",
        "top": "0",
        "width": "1/2",
        "height": "2/3"
      }
    };
    regions[2] = {
      "id": "3",
      "shape": "rectangle",
      "area": {
        "left": "1/4",
        "top": "2/3",
        "width": "1/2",
        "height": "1/3"
      }
    };

    layout = [
      {
        "region": [regions[0], regions[1], regions[2]]
      }
    ];
    region_count = 3;
  } else if (members == 4) {
    regions[0] = {
      "id": "1",
      "shape": "rectangle",
      "area": {
        "left": "0",
        "top": "0",
        "width": "1/2",
        "height": "1/2"
      }
    };
    regions[1] = {
      "id": "2",
      "shape": "rectangle",
      "area": {
        "left": "1/2",
        "top": "0",
        "width": "1/2",
        "height": "1/2"
      }
    };
    regions[2] = {
      "id": "3",
      "shape": "rectangle",
      "area": {
        "left": "0",
        "top": "1/2",
        "width": "1/2",
        "height": "1/2"
      }
    };
    regions[3] = {
      "id": "4",
      "shape": "rectangle",
      "area": {
        "left": "1/2",
        "top": "1/2",
        "width": "1/2",
        "height": "1/2"
      }
    };
    layout = [
      {
        "region": [regions[0], regions[1], regions[2], regions[3]]
      }
    ];
    region_count = 4;
  } else if (members == 5) {
    regions[0] = {
      "id": "1",
      "shape": "rectangle",
      "area": {
        "left": "0",
        "top": "0",
        "width": "1/3",
        "height": "1/2"
      }
    };
    regions[1] = {
      "id": "2",
      "shape": "rectangle",
      "area": {
        "left": "1/3",
        "top": "0",
        "width": "1/3",
        "height": "1/2"
      }
    };
    regions[2] = {
      "id": "3",
      "shape": "rectangle",
      "area": {
        "left": "2/3",
        "top": "0",
        "width": "1/3",
        "height": "1/2"
      }
    };
    regions[3] = {
      "id": "4",
      "shape": "rectangle",
      "area": {
        "left": "1/6",
        "top": "1/2",
        "width": "1/3",
        "height": "1/2"
      }
    };
    regions[4] = {
      "id": "5",
      "shape": "rectangle",
      "area": {
        "left": "3/6",
        "top": "1/2",
        "width": "1/3",
        "height": "1/2"
      }
    };

    layout = [
      {
        "region": [regions[0], regions[1], regions[2], regions[3], regions[4]]
      }
    ];
    region_count = 5;
  } else if (members == 6) {
    regions[0] = {
      "id": "1",
      "shape": "rectangle",
      "area": {
        "left": "0",
        "top": "0",
        "width": "2/3",
        "height": "2/3"
      }
    };
    regions[1] = {
      "id": "2",
      "shape": "rectangle",
      "area": {
        "left": "2/3",
        "top": "0",
        "width": "1/3",
        "height": "1/3"
      }
    };
    regions[2] = {
      "id": "3",
      "shape": "rectangle",
      "area": {
        "left": "2/3",
        "top": "1/3",
        "width": "1/3",
        "height": "1/3"
      }
    };
    regions[3] = {
      "id": "4",
      "shape": "rectangle",
      "area": {
        "left": "2/3",
        "top": "2/3",
        "width": "1/3",
        "height": "1/3"
      }
    };
    regions[4] = {
      "id": "5",
      "shape": "rectangle",
      "area": {
        "left": "1/3",
        "top": "2/3",
        "width": "1/3",
        "height": "1/3"
      }
    };
    regions[5] = {
      "id": "6",
      "shape": "rectangle",
      "area": {
        "left": "0",
        "top": "2/3",
        "width": "1/3",
        "height": "1/3"
      }
    };
    layout = [
      {
        "region": [regions[0], regions[1], regions[2], regions[3], regions[4], regions[5]]
      }
    ];
    region_count = 6;
  } else if (members == 9) {
    regions[0] = {
      "id": "1",
      "shape": "rectangle",
      "area": {
        "left": "0",
        "top": "0",
        "width": "1/3",
        "height": "1/3"
      }
    };
    regions[1] = {
      "id": "2",
      "shape": "rectangle",
      "area": {
        "left": "1/3",
        "top": "0",
        "width": "1/3",
        "height": "1/3"
      }
    };
    regions[2] = {
      "id": "3",
      "shape": "rectangle",
      "area": {
        "left": "2/3",
        "top": "0",
        "width": "1/3",
        "height": "1/3"
      }
    };
    regions[3] = {
      "id": "4",
      "shape": "rectangle",
      "area": {
        "left": "0",
        "top": "1/3",
        "width": "1/3",
        "height": "1/3"
      }
    };
    regions[4] = {
      "id": "5",
      "shape": "rectangle",
      "area": {
        "left": "1/3",
        "top": "1/3",
        "width": "1/3",
        "height": "1/3"
      }
    };
    regions[5] = {
      "id": "6",
      "shape": "rectangle",
      "area": {
        "left": "2/3",
        "top": "1/3",
        "width": "1/3",
        "height": "1/3"
      }
    };
    regions[6] = {
      "id": "7",
      "shape": "rectangle",
      "area": {
        "left": "0",
        "top": "2/3",
        "width": "1/3",
        "height": "1/3"
      }
    };
    regions[7] = {
      "id": "6",
      "shape": "rectangle",
      "area": {
        "left": "1/3",
        "top": "2/3",
        "width": "1/3",
        "height": "1/3"
      }
    };
    regions[8] = {
      "id": "6",
      "shape": "rectangle",
      "area": {
        "left": "2/3",
        "top": "2/3",
        "width": "1/3",
        "height": "1/3"
      }
    };
    layout = [
      {
        "region": [regions[0], regions[1], regions[2], regions[3], regions[4], regions[5], regions[6], regions[7], regions[8]]
      }
    ];
    region_count = 9;
  } else if (members == 11) {
    regions[0] = {
      "id": "1",
      "shape": "rectangle",
      "area": {
        "left": "1/4",
        "top": "1/3",
        "width": "1/2",
        "height": "1/3"
      }
    };
    regions[1] = {
      "id": "2",
      "shape": "rectangle",
      "area": {
        "left": "0",
        "top": "0",
        "width": "1/4",
        "height": "1/3"
      }
    };
    regions[2] = {
      "id": "3",
      "shape": "rectangle",
      "area": {
        "left": "1/4",
        "top": "0",
        "width": "1/4",
        "height": "1/3"
      }
    };
    regions[3] = {
      "id": "4",
      "shape": "rectangle",
      "area": {
        "left": "2/4",
        "top": "0",
        "width": "1/4",
        "height": "1/3"
      }
    };
    regions[4] = {
      "id": "5",
      "shape": "rectangle",
      "area": {
        "left": "3/4",
        "top": "0",
        "width": "1/4",
        "height": "1/3"
      }
    };
    regions[5] = {
      "id": "6",
      "shape": "rectangle",
      "area": {
        "left": "0",
        "top": "1/3",
        "width": "1/4",
        "height": "1/3"
      }
    };
    regions[6] = {
      "id": "7",
      "shape": "rectangle",
      "area": {
        "left": "3/4",
        "top": "1/3",
        "width": "1/4",
        "height": "1/3"
      }
    };
    regions[7] = {
      "id": "8",
      "shape": "rectangle",
      "area": {
        "left": "0",
        "top": "2/3",
        "width": "1/4",
        "height": "1/3"
      }
    };
    regions[8] = {
      "id": "9",
      "shape": "rectangle",
      "area": {
        "left": "1/4",
        "top": "2/3",
        "width": "1/4",
        "height": "1/3"
      }
    };
    regions[9] = {
      "id": "10",
      "shape": "rectangle",
      "area": {
        "left": "2/4",
        "top": "2/3",
        "width": "1/4",
        "height": "1/3"
      }
    };
    regions[10] = {
      "id": "11",
      "shape": "rectangle",
      "area": {
        "left": "3/4",
        "top": "2/3",
        "width": "1/4",
        "height": "1/3"
      }
    };
    layout = [
      {
        "region": [regions[0], regions[1], regions[2], regions[3], regions[4], regions[5],
          regions[6], regions[7], regions[8], regions[9], regions[10]]
      }
    ];
    region_count = 11;
  } else if (members == 16) {
    regions[0] = {
      "id": "1",
      "shape": "rectangle",
      "area": {
        "left": "0",
        "top": "0",
        "width": "1/4",
        "height": "1/4"
      }
    };
    regions[1] = {
      "id": "2",
      "shape": "rectangle",
      "area": {
        "left": "1/4",
        "top": "0",
        "width": "1/4",
        "height": "1/4"
      }
    };
    regions[2] = {
      "id": "3",
      "shape": "rectangle",
      "area": {
        "left": "2/4",
        "top": "0",
        "width": "1/4",
        "height": "1/4"
      }
    };
    regions[3] = {
      "id": "4",
      "shape": "rectangle",
      "area": {
        "left": "3/4",
        "top": "0",
        "width": "1/4",
        "height": "1/4"
      }
    };
    regions[4] = {
      "id": "5",
      "shape": "rectangle",
      "area": {
        "left": "0",
        "top": "1/4",
        "width": "1/4",
        "height": "1/4"
      }
    };
    regions[5] = {
      "id": "6",
      "shape": "rectangle",
      "area": {
        "left": "1/4",
        "top": "1/4",
        "width": "1/4",
        "height": "1/4"
      }
    };
    regions[6] = {
      "id": "7",
      "shape": "rectangle",
      "area": {
        "left": "2/4",
        "top": "1/4",
        "width": "1/4",
        "height": "1/4"
      }
    };
    regions[7] = {
      "id": "8",
      "shape": "rectangle",
      "area": {
        "left": "3/4",
        "top": "1/4",
        "width": "1/4",
        "height": "1/4"
      }
    };
    regions[8] = {
      "id": "9",
      "shape": "rectangle",
      "area": {
        "left": "0",
        "top": "2/4",
        "width": "1/4",
        "height": "1/4"
      }
    };
    regions[9] = {
      "id": "10",
      "shape": "rectangle",
      "area": {
        "left": "1/4",
        "top": "2/4",
        "width": "1/4",
        "height": "1/4"
      }
    };
    regions[10] = {
      "id": "11",
      "shape": "rectangle",
      "area": {
        "left": "2/4",
        "top": "2/4",
        "width": "1/4",
        "height": "1/4"
      }
    };
    regions[11] = {
      "id": "12",
      "shape": "rectangle",
      "area": {
        "left": "3/4",
        "top": "2/4",
        "width": "1/4",
        "height": "1/4"
      }
    };
    regions[12] = {
      "id": "13",
      "shape": "rectangle",
      "area": {
        "left": "0",
        "top": "3/4",
        "width": "1/4",
        "height": "1/4"
      }
    };
    regions[13] = {
      "id": "14",
      "shape": "rectangle",
      "area": {
        "left": "1/4",
        "top": "3/4",
        "width": "1/4",
        "height": "1/4"
      }
    };
    regions[14] = {
      "id": "15",
      "shape": "rectangle",
      "area": {
        "left": "2/4",
        "top": "3/4",
        "width": "1/4",
        "height": "1/4"
      }
    };
    regions[15] = {
      "id": "16",
      "shape": "rectangle",
      "area": {
        "left": "3/4",
        "top": "3/4",
        "width": "1/4",
        "height": "1/4"
      }
    };
    layout = [
      {
        "region": [regions[0], regions[1], regions[2], regions[3], regions[4], regions[5],
          regions[6], regions[7], regions[8], regions[9], regions[10], regions[11], regions[12], regions[13], regions[14], regions[15]]
      }
    ];
    region_count = 16;
  }
  return {
    regions: regions,
    region_count: region_count,
    layout: layout
  };
}
/*******************add end************************************/
////////////////////////////////////////////////////////////////////////////////////////////
// New RESTful interface end
////////////////////////////////////////////////////////////////////////////////////////////


spdy.createServer({
  spdy: {
    plain: true
  }
}, app).listen(3001, (err) => {
  if (err) {
    console.log('Failed to setup plain server, ', err);
    return process.exit(1);
  }
});

var cipher = require('./cipher');
cipher.unlock(cipher.k, 'cert/.woogeen.keystore', function cb(err, obj) {
  if (!err) {
    spdy.createServer({
      pfx: fs.readFileSync('cert/certificate.pfx'),
      passphrase: obj.sample
    }, app).listen(3004, (error) => {
      if (error) {
        console.log('Failed to setup secured server: ', error);
        return process.exit(1);
      }
    });
  }
  if (err) {
    console.error('Failed to setup secured server:', err);
    return process.exit();
  }
});
