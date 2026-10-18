import { DeviceList } from '@/features/auth/components/DeviceList';

export default function DevicesPage() {
    return (
        <div>
            <h1 className="text-2xl font-bold text-stone-800">
                Thiết bị đăng nhập
            </h1>
            <p className="mt-1 text-sm text-stone-500">
                Các phiên đang mở của tài khoản. Thu hồi thiết bị lạ để đăng xuất
                nó từ xa (cần mã 2FA nếu đã bật).
            </p>
            <div className="mt-6">
                <DeviceList />
            </div>
        </div>
    );
}
