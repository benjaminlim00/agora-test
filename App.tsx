import React, { useEffect, useState } from 'react';
import {
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import 'react-native-get-random-values';
import { customAlphabet } from 'nanoid';
import RtcEngine, {
  ChannelProfile,
  ClientRole,
  ErrorCode,
  RtcLocalView,
  RtcRemoteView,
  VideoFrameRate,
  VideoRenderMode,
  WarningCode,
} from 'react-native-agora';
import axios from 'axios';
import requestCameraAndAudioPermission from './components/PermissionsAndroid';
import styles from './components/Style';

//use env
const APP_ID = '4105bde1761842e7afded0067450362f';
const CHANNEL_NAME = 'channel-x';

export default function App() {
  /**
   * @property peerIds Array for storing connected peers
   * @property appId
   * @property channelName Channel Name for the current session
   * @property joinSucceed State variable for storing success
   */
  const [joinSucceed, setJoinSucceed] = useState(false);
  const [peerIds, setPeerIds] = useState<number[]>([]);
  const [engine, setEngine] = useState<RtcEngine | null>(null);

  const [isAudience, setIsAudience] = useState(false);
  const [isHost, setIsHost] = useState(false);

  const [myToken, setMyToken] = useState<string | null>(null);
  const [myUID, setMyUID] = useState<number | null>(null);

  /**
   * @name init
   * @description Function to initialize the Rtc Engine, attach event listeners and actions
   */
  const init = async () => {
    const _engine = await RtcEngine.create(APP_ID);
    setEngine(_engine);

    _engine.setVideoEncoderConfiguration({ frameRate: VideoFrameRate.Fps30 });
    await _engine.enableVideo();

    //LiveBroadcasting profile
    _engine.setChannelProfile(ChannelProfile.LiveBroadcasting);
    _engine.setClientRole(ClientRole.Broadcaster);
    setIsHost(true);

    // _engine.setClientRole(ClientRole.Audience);
    // setIsAudience(true);

    _engine.addListener('Warning', (warn) => {
      console.log(`Warning ${warn}: `, WarningCode[warn]);
    });

    _engine.addListener('Error', (err) => {
      console.log(`Error ${err}: `, ErrorCode[err]);
    });

    _engine.addListener('UserJoined', (uid, elapsed) => {
      console.log('UserJoined', uid, elapsed);
      // If new user
      if (peerIds.indexOf(uid) === -1) {
        setPeerIds([...peerIds, uid]);
      }
    });

    _engine.addListener('UserOffline', (uid, reason) => {
      console.log('UserOffline', uid, reason);
      setPeerIds(peerIds.filter((id) => id !== uid));
    });

    // If Local user joins RTC channel
    _engine.addListener('JoinChannelSuccess', (channel, uid, elapsed) => {
      console.log('JoinChannelSuccess', channel, uid, elapsed);
      setJoinSucceed(true);
    });

    // // show mute icon whenever a remote has muted their mic
    // client.on('mute-audio', function (evt) {
    //   console.log('Mute Audio for: ' + evt.uid);
    // });

    // client.on('unmute-audio', function (evt) {
    //   console.log('Unmute Audio for: ' + evt.uid);
    // });
  };

  useEffect(() => {
    if (Platform.OS === 'android') {
      // Request required permissions from Android
      requestCameraAndAudioPermission().then(() => {
        console.log('requested!');
      });
    }
  }, []);

  useEffect(() => {
    const nanoid = customAlphabet('1234567890', 10);
    const _myUID = parseInt(nanoid());
    setMyUID(_myUID);

    getTokenFromServer(_myUID);
  }, []);

  const getTokenFromServer = async (myUID) => {
    //if not working: edit manifest - https://github.com/facebook/react-native/issues/24039
    axios
      .get(
        `https://backstage-agora-token-server.herokuapp.com/access_token?channel=${CHANNEL_NAME}&uid=${myUID}`,
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        },
      )
      .then((res) => {
        // console.log('first');
        // console.log('Token: ', res.data.token);
        // console.log('UID: ', myUID);
        setMyToken(res.data.token);
      })
      .catch((err) => {
        console.log('Error fetching token: ' + err);
      });
  };

  useEffect(() => {
    init();
  }, []);

  /**
   * @name startCall
   * @description Function to start the call
   */
  const startCall = async () => {
    // console.log('second');
    // console.log('Token: ', myToken);
    // console.log('UID: ', myUID);
    if (myUID) {
      // Join Channel using null token and channel name
      engine &&
        (await engine.joinChannel(
          myToken,
          CHANNEL_NAME,
          null, //optional info
          myUID, //optional uid - If you set uid as 0, the SDK assigns a user ID for
          //the local user and returns it in the JoinChannelSuccess callback.
        ));
    } else {
      console.log('myUID not set yet!');
    }
  };

  /**
   * @name endCall
   * @description Function to end the call
   */
  const endCall = async () => {
    if (engine) {
      await engine.leaveChannel();
      setPeerIds([]);
      setJoinSucceed(false);
    }
  };

  console.log('ben side', peerIds); //test this val
  return (
    <View style={styles.max}>
      <View style={styles.max}>
        <View style={styles.buttonHolder}>
          <TouchableOpacity onPress={startCall} style={styles.button}>
            <Text style={styles.buttonText}> Start Call </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={endCall} style={styles.button}>
            <Text style={styles.buttonText}> End Call </Text>
          </TouchableOpacity>
        </View>
        {joinSucceed && (
          <View style={styles.fullView}>
            {isHost && (
              <RtcLocalView.SurfaceView
                style={styles.max}
                channelId={CHANNEL_NAME}
                renderMode={VideoRenderMode.Hidden}
              />
            )}

            {isAudience && (
              <ScrollView
                style={styles.remoteContainer}
                contentContainerStyle={{ paddingHorizontal: 2.5 }}
                horizontal={true}
              >
                {peerIds.map((value, index, array) => {
                  return (
                    <RtcRemoteView.SurfaceView
                      style={styles.remote}
                      uid={value}
                      channelId={CHANNEL_NAME}
                      renderMode={VideoRenderMode.Hidden}
                      zOrderMediaOverlay={true}
                    />
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
