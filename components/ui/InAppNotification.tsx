import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCircle, AlertCircle, Clock, Check } from 'lucide-react-native';
import { useNotification, Notification } from '@/hooks/useNotification';
import { useAuth } from '@/contexts/AuthContext';
import Portal from './Portal';
import theme from '@/constants/theme';

interface InAppNotificationProps {
  onNotificationPress?: (notification: Notification) => void;
}

export default function InAppNotification({ onNotificationPress }: InAppNotificationProps) {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications } = useNotification();
  const [showDropdown, setShowDropdown] = useState(false);
  const slideAnim = useRef(new Animated.Value(-300)).current;

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  useEffect(() => {
    if (showDropdown) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showDropdown]);

  const handleToggleDropdown = () => {
    setShowDropdown(prev => !prev);
  };

  const handleCloseDropdown = () => {
    setShowDropdown(false);
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    if (onNotificationPress) {
      onNotificationPress(notification);
    }
    setShowDropdown(false);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'demande_validee':
        return <CheckCircle size={18} color={theme.colors.success.DEFAULT} />;
      case 'demande_rejetee':
        return <AlertCircle size={18} color={theme.colors.danger.DEFAULT} />;
      case 'demande_examen':
        return <Clock size={18} color={theme.colors.warning.DEFAULT} />;
      default:
        return <Bell size={18} color={theme.colors.primary.DEFAULT} />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays === 1) return 'Hier';
    return date.toLocaleDateString('fr-FR');
  };

  const dropdownContent = (
    <Animated.View style={[styles.dropdown, { transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.dropdownHeader}>
        <Text style={styles.dropdownTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <Text style={styles.markAllText}>Tout marquer comme lu</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.notificationList} showsVerticalScrollIndicator={false}>
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Bell size={32} color={theme.colors.neutral[300]} />
            <Text style={styles.emptyText}>Aucune notification</Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[styles.notificationItem, !notification.is_read && styles.notificationItemUnread]}
              onPress={() => handleNotificationPress(notification)}
              activeOpacity={0.7}
            >
              <View style={styles.notificationIcon}>
                {getNotificationIcon(notification.type)}
              </View>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>{notification.titre}</Text>
                <Text style={styles.notificationMessage} numberOfLines={2}>
                  {notification.message}
                </Text>
                <Text style={styles.notificationDate}>
                  {formatDate(notification.created_at)}
                </Text>
              </View>
              {!notification.is_read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </Animated.View>
  );

  return (
    <>
      {/* Bouton de notification */}
      <TouchableOpacity
        style={styles.bellButton}
        onPress={handleToggleDropdown}
        activeOpacity={0.7}
      >
        <Bell size={22} color={theme.colors.neutral[600]} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Overlay et dropdown via Portal */}
      {showDropdown && (
        <Portal isVisible={showDropdown}>
          <>
            <TouchableOpacity
              style={styles.overlay}
              activeOpacity={1}
              onPress={handleCloseDropdown}
            />
            {dropdownContent}
          </>
        </Portal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  bellButton: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: theme.colors.danger.DEFAULT,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 9998,
  },
  dropdown: {
    position: 'fixed',
    top: 60,
    right: 10,
    width: 320,
    maxHeight: 450,
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 9999,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.background.primary,
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.neutral[800],
  },
  markAllText: {
    fontSize: 12,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  notificationList: {
    maxHeight: 350,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[100],
    position: 'relative',
  },
  notificationItemUnread: {
    backgroundColor: '#EFF6FF',
  },
  notificationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.neutral[800],
    marginBottom: 2,
  },
  notificationMessage: {
    fontSize: 12,
    color: theme.colors.neutral[600],
    lineHeight: 16,
  },
  notificationDate: {
    fontSize: 10,
    color: theme.colors.neutral[400],
    marginTop: 4,
  },
  unreadDot: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.neutral[400],
    marginTop: 12,
  },
});