import webPush from 'web-push';

webPush.setVapidDetails(
  'mailto:yamidjhonatan@gmail.com',
  'BPDEYZBp_Qe_a5cWiFmxXlLgjQciJEyOBGXksenVCowDsGXvqJLlnwlIKDrQZKKOhAI5mt_pPLaRU8NSFhbsqH4',
  'LoHeZN2dKkOj_DWpcgA5sZYQdcTdjjm5aFsT4d6WEqg'
);

export async function POST() {
  const pushSubscription = {
    endpoint:
      'https://fcm.googleapis.com/fcm/send/cDVpb0-IhMQ:APA91bEi5Z8kLbPbFOgvmQf-otmLKbEND8DP4KM3XirMxEXI-XqEpk6Rbfk9ifoff_xdHWCEsWMMyIhFG9dsg7nzzET0cTciO1zLqLII4Xnp1YubmqSjdUz6jc-kGSfCpUtRKGrg74Yc',
    keys: {
      auth: 'PUo9lzuX2XcM45lhqPAG1Q',
      p256dh:
        'BMpkUPWSnAtHz1XpZuJ6KZWezzM6G7o5PYaQ2NfZ2CqgfT7NPLGASEJXmqrQSDascTZnieoxnadzMHW8XA8PkAo',
    },
  };
  const notificationPayload = JSON.stringify({
    title: 'test2024',
    body: 'funciona',
  });
  try {
    webPush.sendNotification(pushSubscription, notificationPayload).catch((err) => {
      return new Response(err);
    });
    return new Response('super!' + JSON.stringify({ success: false, message: 'se fue' }));
  } catch (error) {
    return new Response('error: ' + error);
  }
}
