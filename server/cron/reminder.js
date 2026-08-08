import cron from 'node-cron';
import webpush from 'web-push';
import { getUsersWithoutRecentUpload, getPushSubscriptionsByUser, deletePushSubscription } from '../db.js';

export function startReminderCron() {
  console.log('Starting weekly reminder cron job...');
  // Every Sunday at 10:00 AM
  cron.schedule('0 10 * * 0', async () => {
    console.log('Running weekly reminder job...');
    try {
      const users = getUsersWithoutRecentUpload(7);
      
      for (const user of users) {
        const subscriptions = getPushSubscriptionsByUser(user.id);
        
        for (const sub of subscriptions) {
          const pushSubscription = JSON.parse(sub.keys_json);
          const payload = JSON.stringify({
            title: 'Memory Vault Reminder 📸',
            body: "You haven't saved a memory this week! Don't let moments fade away.",
            icon: '/icons/icon-192.png',
            url: '/'
          });

          try {
            await webpush.sendNotification(pushSubscription, payload);
          } catch (error) {
            console.error(`Failed to send notification to ${sub.endpoint}: `, error.message);
            if (error.statusCode === 410 || error.statusCode === 404) {
              // Subscription has expired or is no longer valid
              deletePushSubscription(sub.endpoint);
              console.log(`Deleted invalid subscription for ${sub.endpoint}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in reminder cron job:', error);
    }
  });
}

export async function sendTestNotification(userId) {
  try {
    const subscriptions = getPushSubscriptionsByUser(userId);
    let successCount = 0;
    
    for (const sub of subscriptions) {
      const pushSubscription = JSON.parse(sub.keys_json);
      const payload = JSON.stringify({
        title: 'Memory Vault Reminder 📸',
        body: "You haven't saved a memory this week! Don't let moments fade away.",
        icon: '/icons/icon-192.png',
        url: '/'
      });

      try {
        await webpush.sendNotification(pushSubscription, payload);
        successCount++;
      } catch (error) {
        console.error(`Test push failed for ${sub.endpoint}:`, error.message);
        if (error.statusCode === 410 || error.statusCode === 404) {
          deletePushSubscription(sub.endpoint);
        }
      }
    }
    return successCount;
  } catch (error) {
    console.error('Error sending test notification:', error);
    return 0;
  }
}
